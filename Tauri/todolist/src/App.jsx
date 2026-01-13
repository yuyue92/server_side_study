import React, { useEffect, useMemo, useRef, useState } from "react";
import Todos from "./components/Todos";
import Users from "./components/Users";
import { loadAppData, saveAppData } from "./storage";
import "./styles.css";

const TAB = {
  TODOS: "todos",
  USERS: "users"
};

export default function App() {
  const [tab, setTab] = useState(TAB.TODOS);
  const [data, setData] = useState({ todos: [], users: [] });
  const [loaded, setLoaded] = useState(false);

  // 简单防抖保存：避免每次 setState 都立刻写文件
  const saveTimer = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      const d = await loadAppData();
      setData(d);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveAppData(dataRef.current);
    }, 300);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [data, loaded]);

  const headerTitle = useMemo(() => {
    return tab === TAB.TODOS ? "Todo App" : "User Management";
  }, [tab]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="title">{headerTitle}</div>
        <div className="tabs">
          <button className={tab === TAB.TODOS ? "tab active" : "tab"} onClick={() => setTab(TAB.TODOS)}>
            Todos
          </button>
          <button className={tab === TAB.USERS ? "tab active" : "tab"} onClick={() => setTab(TAB.USERS)}>
            Users
          </button>
        </div>
      </div>

      <div className="content">
        {tab === TAB.TODOS ? (
          <Todos
            todos={data.todos}
            onChange={(todos) => setData((prev) => ({ ...prev, todos }))}
          />
        ) : (
          <Users
            users={data.users}
            onChange={(users) => setData((prev) => ({ ...prev, users }))}
          />
        )}
      </div>

      <div className="footer">
        数据位置：%APPDATA% 下的 <code>tauri-react-demo/data.json</code>
      </div>
    </div>
  );
}
