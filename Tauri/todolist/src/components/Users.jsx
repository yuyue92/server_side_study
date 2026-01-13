import React, { useMemo, useState } from "react";
import { confirm, message } from "@tauri-apps/plugin-dialog";

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Users({ users, onChange }) {
    const [q, setQ] = useState("");
    const [form, setForm] = useState({ name: "", email: "", role: "user" });
    const [editingId, setEditingId] = useState(null);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return users;
        return users.filter((u) => (u.name + " " + u.email + " " + u.role).toLowerCase().includes(s));
    }, [users, q]);

    function resetForm() {
        setForm({ name: "", email: "", role: "user" });
        setEditingId(null);
    }

    async function submit() {
        const name = form.name.trim();
        const email = form.email.trim();
        if (!name || !email) {
            await message("name/email 不能为空", { title: "Validation", kind: "warning" });
            return;
        }

        if (editingId) {
            onChange(users.map((u) => (u.id === editingId ? { ...u, ...form, updatedAt: Date.now() } : u)));
            resetForm();
            return;
        }

        const next = [{ id: uid(), ...form, createdAt: Date.now(), updatedAt: Date.now() }, ...users];
        onChange(next);
        resetForm();
    }

    function edit(u) {
        setEditingId(u.id);
        setForm({ name: u.name, email: u.email, role: u.role });
    }

    async function remove(u) {
        const ok = await confirm(`确定删除用户 "${u.name}" 吗？`, { title: "Confirm", kind: "warning" });
        if (!ok) return;
        onChange(users.filter((x) => x.id !== u.id));
        if (editingId === u.id) resetForm();
    }

    return (
        <div className="card">
            <div className="row">
                <input className="input" value={q} placeholder="搜索 name/email/role" onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="form">
                <div className="row gap">
                    <input
                        className="input"
                        value={form.name}
                        placeholder="name"
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                        className="input"
                        value={form.email}
                        placeholder="email"
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                    <select
                        className="select"
                        value={form.role}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="viewer">viewer</option>
                    </select>
                    <div className="row gap">
                        <button className="btn" onClick={submit}>{editingId ? "Update" : "Create"}</button>
                        <button className="btn secondary" onClick={resetForm}>Reset</button>
                    </div>
                </div>

            </div>

            <div className="list">
                {filtered.length === 0 ? (
                    <div className="empty">暂无用户</div>
                ) : (
                    filtered.map((u) => (
                        <div key={u.id} className="item">
                            <div className="col">
                                <div className="strong">{u.name} <span className="badge">{u.role}</span></div>
                                <div className="muted">{u.email}</div>
                            </div>
                            <div className="row gap">
                                <button className="btn secondary" onClick={() => edit(u)}>Edit</button>
                                <button className="btn danger" onClick={() => remove(u)}>Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
