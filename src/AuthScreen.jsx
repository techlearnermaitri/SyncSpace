import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "An account already exists. Please log in."
          : err.code === "auth/invalid-credential"
            ? "Incorrect email or password."
            : err.code === "auth/weak-password"
              ? "Use a password with at least 6 characters."
              : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#10111c",
        color: "#f4f3ff",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 390,
          padding: 32,
          borderRadius: 20,
          border: "1px solid #343348",
          background: "#191a29",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "#b8aaff",
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          SYNCSPACE
        </div>

        <h1 style={{ marginBottom: 8 }}>
          {mode === "login"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <p style={{ color: "#aaa9bf", marginBottom: 28 }}>
          {mode === "login"
            ? "Sign in to continue to your workspace."
            : "Get your team workspace started."}
        </p>

        <label style={{ display: "block", marginBottom: 16 }}>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "block", marginBottom: 20 }}>
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error && (
          <p
            role="alert"
            style={{ color: "#ff9baf", fontSize: 13 }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 13,
            border: 0,
            borderRadius: 10,
            background: "#8b7bff",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: 22,
            fontSize: 14,
            color: "#aaa9bf",
          }}
        >
          {mode === "login"
            ? "New to SyncSpace? "
            : "Already have an account? "}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            style={{
              border: 0,
              background: "transparent",
              color: "#b8aaff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 8,
  padding: 12,
  borderRadius: 9,
  border: "1px solid #424159",
  background: "#11121e",
  color: "#ffffff",
  outlineColor: "#8b7bff",
};