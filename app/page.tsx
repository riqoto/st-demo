"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, ArrowRight, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createRoom, verifyOtp } from "@/lib/firebaseService";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "create">("email");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("sketchsync_admin_token");
      if (token) {
        const { validateSession } = await import("@/lib/firebaseService");
        const res = await validateSession(token);
        if (res.valid && res.email) {
          setEmail(res.email);
          setStep("create");
        }
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleRequestOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Lütfen geçerli bir e-posta girin");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kod gönderilemedi");
      }

      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (!otp.trim() || otp.length < 6) {
      setError("Lütfen 6 haneli kodu girin");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const result = await verifyOtp(email.trim(), otp.trim());
      if (!result.valid) {
        throw new Error(result.error || "Geçersiz kod");
      }

      // Valid OTP. Create session locally
      const { createSession } = await import("@/lib/firebaseService");
      const token = await createSession(email.trim());
      localStorage.setItem("sketchsync_admin_token", token);
      localStorage.setItem("sketchsync_admin_email", email.trim());
      
      setStep("create");
    } catch (err: any) {
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError("");
    try {
      const room = await createRoom(email.trim());
      router.push(`/admin/${room.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-4">
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-4">

      <div className="mb-12 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <PenTool className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl  tracking-tighter">Sketch</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-1 border-border shadow-bold rounded-xl overflow-hidden">
          <CardHeader className="text-left pb-6 pt-8">
            <CardTitle className="text-xl font-extrabold tracking-tight">
              Yönetici Girişi
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-2">
            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.form
                  key="email-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRequestOtp();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="admin-email"
                      className="text-sm font-medium leading-none flex mb-2"
                    >
                      Yönetici E-posta
                    </label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 font-semibold"
                      autoFocus
                    />
                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!email.trim() || loading}
                    className="w-full h-14 rounded-xl text-sm font-bold tracking-wide uppercase"
                  >
                    {loading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        Gönderiliyor…
                      </motion.span>
                    ) : (
                      <>
                        Giriş Kodu Gönder <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : step === "otp" ? (
                <motion.form
                  key="otp-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyAndCreate();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="admin-otp"
                      className="text-sm flex mb-4 font-medium leading-none"
                    >
                      6-Haneli Kod
                    </label>
                    <Input
                      id="admin-otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="h-14 text-center tracking-widest text-lg font-mono"
                      maxLength={6}
                      autoFocus
                    />
                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={otp.length < 6 || loading}
                    className="w-full h-14 rounded-xl text-sm font-bold tracking-wide uppercase"
                  >
                    {loading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        Doğrulanıyor…
                      </motion.span>
                    ) : (
                      "Doğrula"
                    )}
                  </Button>

                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setError("");
                      }}
                      className="text-xs text-muted-foreground hover:text-black hover:underline"
                    >
                      E-posta sayfasına dön
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="create-step"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2 pb-4">
                    <p className="text-sm font-medium text-muted-foreground">Kullanıcı:</p>
                    <p className="font-bold">{email}</p>
                  </div>
                  
                  <Button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="w-full h-14 rounded-xl text-sm font-bold tracking-wide uppercase"
                  >
                    {loading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        Oda Oluşturuluyor…
                      </motion.span>
                    ) : (
                      "Yeni Çizim Odası Oluştur"
                    )}
                  </Button>

                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("sketchsync_admin_token");
                        localStorage.removeItem("sketchsync_admin_email");
                        setStep("email");
                        setEmail("");
                      }}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Oturum oluşturulduktan sonra katılımcılar QR kod ile odaya katılabilir
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
