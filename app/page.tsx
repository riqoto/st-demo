"use client";

import { useState } from "react";
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
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRequestOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
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
        throw new Error(data.error || "Failed to send code");
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
      setError("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const result = await verifyOtp(email.trim(), otp.trim());
      if (!result.valid) {
        throw new Error(result.error || "Invalid code");
      }

      // Valid OTP. Create room.
      const room = await createRoom(email.trim());
      router.push(`/admin/${room.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

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
              Sign in as Admin
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
                      Admin Email
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
                        Sending…
                      </motion.span>
                    ) : (
                      <>
                        Send Login Code <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.form>
              ) : (
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
                      6-Digit Code
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
                        Verifying & Creating…
                      </motion.span>
                    ) : (
                      "Verify & Create Session"
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
                      Back to Email
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="text-xs text-muted-foreground text-center mt-6">
              Participants will join via QR code after session creation
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
