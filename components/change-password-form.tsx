"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='form-well space-y-4'>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>Current password</span>
        <input
          type='password'
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete='current-password'
          className='w-full rounded-lg border border-gray-300 p-3'
        />
      </label>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>New password</span>
        <input
          type='password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          autoComplete='new-password'
          className='w-full rounded-lg border border-gray-300 p-3'
        />
      </label>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>Confirm new password</span>
        <input
          type='password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete='new-password'
          className='w-full rounded-lg border border-gray-300 p-3'
        />
      </label>
      {error && <p className='text-sm text-red-600'>{error}</p>}
      {message && <p className='text-sm text-emerald-700'>{message}</p>}
      <Button type='submit' disabled={saving}>
        {saving ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
