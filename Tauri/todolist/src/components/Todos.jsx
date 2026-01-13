import React, { useMemo, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Todos({ todos, onChange }) {
    const [text, setText] = useState("");
    const [filter, setFilter] = useState("all"); // all | active | done

    const filtered = useMemo(() => {
        if (filter === "active") return todos.filter((t) => !t.done);
        if (filter === "done") return todos.filter((t) => t.done);
        return todos;
    }, [todos, filter]);

    function addTodo() {
        const v = text.trim();
        if (!v) return;
        const next = [{ id: uid(), text: v, done: false, createdAt: Date.now() }, ...todos];
        onChange(next);
        setText("");
    }

    function toggle(id) {
        onChange(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    }

    async function remove(id) {
        const ok = await confirm("确定删除这条 Todo 吗？", { title: "Confirm", kind: "warning" });
        if (!ok) return;
        onChange(todos.filter((t) => t.id !== id));
    }

    function clearDone() {
        onChange(todos.filter((t) => !t.done));
    }

    return (
        <div className="card">
            <div className="row">
                <input
                    className="input"
                    value={text}
                    placeholder="输入一个待办，比如：Buy milk"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTodo()}
                />
                <button className="btn" onClick={addTodo}>Add</button>
                <div className="seg">
                    <button className={filter === "all" ? "seg-btn active" : "seg-btn"} onClick={() => setFilter("all")}>All</button>
                    <button className={filter === "active" ? "seg-btn active" : "seg-btn"} onClick={() => setFilter("active")}>Active</button>
                    <button className={filter === "done" ? "seg-btn active" : "seg-btn"} onClick={() => setFilter("done")}>Done</button>
                    <button className="btn secondary" onClick={clearDone}>Clear Done</button>
                </div>
            </div>

            <div className="list">
                {filtered.length === 0 ? (
                    <div className="empty">暂无数据</div>
                ) : (
                    filtered.map((t) => (
                        <div key={t.id} className="item">
                            <label className="item-left">
                                <input type="checkbox" checked={!!t.done} onChange={() => toggle(t.id)} />
                                <span className={t.done ? "text done" : "text"}>{t.text}</span>
                            </label>
                            <button className="btn danger" onClick={() => remove(t.id)}>Delete</button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
