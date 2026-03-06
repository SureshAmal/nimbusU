"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid credentials. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-svh items-center justify-center p-4"
      style={{ background: "var(--background)" }}
    >
      <Card
        className="mx-auto w-full max-w-md"
        style={{
          boxShadow: "var(--shadow-xl)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <CardHeader className="text-center space-y-2">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--primary)" }}
          >
            <GraduationCap
              className="h-7 w-7"
              style={{ color: "var(--primary-foreground)" }}
            />
          </div>
          <CardTitle style={{ fontSize: "var(--text-2xl)" }}>
            Welcome to NimbusU
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-md p-3 text-sm"
                style={{
                  background: "oklch(0.577 0.245 27.325 / 10%)",
                  color: "var(--destructive)",
                  borderRadius: "var(--radius)",
                }}
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="enter you password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ borderRadius: "var(--radius)" }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
