// App.js
import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import "./App.css";

function App() {
  const [queue, setQueue] = useState([]);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [theme, setTheme] = useState("custom");

  // filter states
  const [filter, setFilter] = useState("all"); // all, today, month, year
  const [searchName, setSearchName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // asc = เก่าสุดบน, desc = ใหม่สุดบน

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // ✅ Query Firestore ตาม filter
  useEffect(() => {
    const colRef = collection(db, "queue");
    let q = query(colRef);

    if (filter === "today") {
      const today = new Date();
      const todayStr = today
        .toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "/");
      q = query(colRef, where("date", "==", todayStr));
    } else if (selectedYear && selectedMonth !== "") {
      q = query(colRef, where("date", ">=", "01/01/0000"));
    } else if (selectedYear && selectedMonth === "") {
      q = query(colRef, where("date", ">=", "01/01/0000"));
    } else if (filter === "month" || filter === "year") {
      q = query(colRef, where("date", ">=", "01/01/0000"));
    } else if (filter === "all") {
      q = query(colRef);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // filter month/year
      if (filter === "month" || filter === "year" || (selectedYear && selectedMonth !== "")) {
        data = data.filter((d) => {
          if (!d.date) return false;
          const [day, month, year] = d.date.split("/").map((x) => parseInt(x));
          const now = new Date();

          if (filter === "month") {
            return month === now.getMonth() + 1 && year === now.getFullYear();
          }
          if (filter === "year") {
            return year === now.getFullYear();
          }
          if (selectedYear && selectedMonth !== "") {
            return year === parseInt(selectedYear) && month === parseInt(selectedMonth) + 1;
          }
          return true;
        });
      }

      // ✅ sort ด้วย time + createdAt
      data.sort((a, b) => {
        if (!a.time || !b.time) return 0;
        if (a.time === b.time) {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
        }
        return sortOrder === "asc"
          ? a.time.localeCompare(b.time)
          : b.time.localeCompare(a.time);
      });

      if (filter !== "all") {
        data = data.filter((d) => d.status !== "done");
      }

      if (searchName) {
        data = data.filter((d) =>
          d.name.toLowerCase().includes(searchName.toLowerCase())
        );
      }

      setQueue(data);
    });

    return () => unsubscribe();
  }, [filter, searchName, selectedMonth, selectedYear, sortOrder]);

  // ✅ เพิ่มคิวใหม่
  const addQueue = async () => {
    if (!name || !time) return alert("กรอกข้อมูลให้ครบ");

    await addDoc(collection(db, "queue"), {
      name,
      time,
      status: "waiting",
      createdAt: serverTimestamp(), // ✅ เก็บเวลา
    });

    setName("");
    setTime("");
  };

  const updateStatus = async (id, newStatus) => {
    const ref = doc(db, "queue", id);
    await updateDoc(ref, { status: newStatus });
  };

  const removeQueue = async (id) => {
    const ref = doc(db, "queue", id);
    await deleteDoc(ref);
  };

  return (
    <div className="app-container">
      <div className="theme-switcher">
        <button onClick={() => setTheme("light")}>Light</button>
        <button onClick={() => setTheme("dark")}>Dark</button>
        <button onClick={() => setTheme("custom")}>Custom</button>
      </div>

      <div className="app-title">
        <div className="app-badge">✂️</div>
        <h1>ระบบจัดการคิวร้านตัดผม</h1>
      </div>

      <div className="form">
        <input
          className="input"
          placeholder="ชื่อ..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="เวลา เช่น 10:30"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <button className="btn btn-add" onClick={addQueue}>
          ➕ เพิ่มคิว
        </button>
      </div>

      <div className="filter-row">
        <div className="filter-bar">
          <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">ทั้งหมด</option>
            <option value="today">วันนี้</option>
            <option value="month">เดือนนี้</option>
            <option value="year">ปีนี้</option>
          </select>

          <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="">เลือกเดือน</option>
            <option value="0">มกราคม</option>
            <option value="1">กุมภาพันธ์</option>
            <option value="2">มีนาคม</option>
            <option value="3">เมษายน</option>
            <option value="4">พฤษภาคม</option>
            <option value="5">มิถุนายน</option>
            <option value="6">กรกฎาคม</option>
            <option value="7">สิงหาคม</option>
            <option value="8">กันยายน</option>
            <option value="9">ตุลาคม</option>
            <option value="10">พฤศจิกายน</option>
            <option value="11">ธันวาคม</option>
          </select>

          <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option value="">เลือกปี</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>

          <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">เก่าสุดบน</option>
            <option value="desc">ใหม่สุดบน</option>
          </select>
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาชื่อ..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          {searchName && (
            <button className="clear-btn" onClick={() => setSearchName("")} title="ล้าง">
              ❌
            </button>
          )}
        </div>
      </div>

      <div className="queue-list">
        {queue.map((q) => {
          return (
            <div key={q.id} className="card">
              <div className="card-info">
                <div>
                  <b>{q.name}</b>
                </div>
                <div className="card-meta">
                  วันที่: {q.date || "-"} | เวลา: {q.time || "-"}
                </div>
                <div style={{ marginTop: 8 }}>
                  สถานะ:{" "}
                  <span
                    className="status-pill"
                    style={{
                      background:
                        q.status === "done"
                          ? "rgba(16,185,129,0.06)"
                          : "rgba(245,158,11,0.04)",
                      color:
                        q.status === "done" ? "var(--green)" : "var(--orange)",
                    }}
                  >
                    {q.status}
                  </span>
                </div>
              </div>

              <div className="actions">
                <button className="btn-small btn-done" onClick={() => updateStatus(q.id, "done")}>
                  ✔️ เสร็จแล้ว
                </button>
                <button className="btn-small btn-wait" onClick={() => updateStatus(q.id, "waiting")}>
                  ⏳ รอคิว
                </button>
                <button className="btn-small btn-delete" onClick={() => removeQueue(q.id)}>
                  ❌ ลบ
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
