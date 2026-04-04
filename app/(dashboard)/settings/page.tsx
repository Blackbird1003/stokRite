"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Lock, ShieldCheck, Check, Camera, LogOut, Users, Trash2, UserPlus } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  activated: boolean;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const initials = (session?.user?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name
  const [name, setName] = useState(session?.user?.name || "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  // Staff management
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    if (!isAdmin) return;
    setStaffLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (res.ok) setStaff(data.staff);
    } finally {
      setStaffLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError("");
    setStaffSuccess("");
    if (!staffName.trim() || !staffEmail.trim()) {
      setStaffError("Name and email are required.");
      return;
    }
    setAddingStaff(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: staffName, email: staffEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setStaffError(data.error || "Failed to send invite."); return; }
      setStaffSuccess(`Invite sent to ${staffEmail}.`);
      setStaffName(""); setStaffEmail("");
      setShowAddStaff(false);
      fetchStaff();
      setTimeout(() => setStaffSuccess(""), 4000);
    } catch {
      setStaffError("An error occurred.");
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    setRemovingId(staffId);
    try {
      await fetch("/api/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      fetchStaff();
    } finally {
      setRemovingId(null);
    }
  };

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  const avatarUrl = session?.user?.avatarUrl;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { setAvatarError(uploadData.error || "Upload failed."); return; }

      const patchRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadData.url }),
      });
      if (!patchRes.ok) { setAvatarError("Failed to save avatar."); return; }
      await update({ avatarUrl: uploadData.url });
    } catch {
      setAvatarError("An error occurred.");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError("Name cannot be empty."); return; }
    setNameLoading(true);
    setNameError("");
    setNameSuccess(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setNameError(data.error || "Failed to update name."); return; }
      await update({ name: name.trim() });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch {
      setNameError("An error occurred.");
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { setPwError("Current password is required."); return; }
    if (newPassword.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    setPwError("");
    setPwSuccess(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Failed to update password."); return; }
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      setPwError("An error occurred.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" description="Manage your account and preferences" />

      <div className="flex-1 p-6 space-y-6 max-w-xl overflow-y-auto">

        {/* Account Overview */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-4">
            {/* Avatar with upload overlay */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity disabled:opacity-50"
                title="Change photo"
              >
                {avatarLoading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{session?.user?.name}</p>
              <p className="text-sm text-slate-400">{session?.user?.email}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="text-xs text-indigo-600 hover:text-indigo-500 mt-1 transition-colors disabled:opacity-50"
              >
                {avatarLoading ? "Uploading..." : "Change photo"}
              </button>
              {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
            </div>

            <Badge
              className={
                isAdmin
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200 shrink-0"
                  : "bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0"
              }
              variant="outline"
            >
              {isAdmin ? "Administrator" : "Staff"}
            </Badge>
          </div>
        </section>

        {/* Display Name */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Display Name</h2>
          </div>
          <form onSubmit={handleNameSave} className="p-5 space-y-4">
            {nameError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{nameError}</div>
            )}
            {nameSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> Name updated successfully.
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input value={session?.user?.email || ""} disabled className="bg-slate-50 text-slate-400" />
              <p className="text-xs text-slate-400">Email cannot be changed.</p>
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500" disabled={nameLoading}>
              {nameLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Name"}
            </Button>
          </form>
        </section>

        {/* Change Password */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordSave} className="p-5 space-y-4">
            {pwError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> Password updated successfully.
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPwError(""); }}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwError(""); }}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwError(""); }}
                placeholder="Repeat new password"
              />
            </div>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500" disabled={pwLoading}>
              {pwLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : "Update Password"}
            </Button>
          </form>
        </section>

        {/* Staff Management — admin only */}
        {isAdmin && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-700">Staff Management</h2>
              </div>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 h-8 text-xs gap-1.5"
                onClick={() => { setShowAddStaff((v) => !v); setStaffError(""); }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Staff
              </Button>
            </div>

            <div className="p-5 space-y-4">
              {staffSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> {staffSuccess}
                </div>
              )}

              {showAddStaff && (
                <form onSubmit={handleAddStaff} className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-slate-700">Invite Staff Member</p>
                  <p className="text-xs text-slate-400">An invite link will be sent to their email to set up their password.</p>
                  {staffError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">{staffError}</div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name</Label>
                    <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="e.g. Amara Okafor" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email Address</Label>
                    <Input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="staff@example.com" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-500" disabled={addingStaff}>
                      {addingStaff ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending...</> : "Send Invite"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddStaff(false); setStaffError(""); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {staffLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : staff.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No staff members yet. Add one above.</p>
              ) : (
                <div className="space-y-2">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                          {!member.activated && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                              Invite Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(member.id)}
                        disabled={removingId === member.id}
                        className="ml-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                        title="Remove staff member"
                      >
                        {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Account section */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Account</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500 mb-4">Sign out of your account on this device.</p>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
