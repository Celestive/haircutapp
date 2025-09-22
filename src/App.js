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
  getDoc,
  setDoc,
} from "firebase/firestore";
import "./App.css";

const slotConfig = {
  morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"],
  afternoon: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"],
  evening: ["17:00", "17:30", "18:00", "18:30", "19:00"],
};

function App() {
  const [queue, setQueue] = useState([]);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [theme, setTheme] = useState("custom");

  const [filter, setFilter] = useState("all");
  const [searchName, setSearchName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // --- settings state ---
  const [availableSlots, setAvailableSlots] = useState([]);
  const [disabledSlots, setDisabledSlots] = useState([]);

  const todayStr = getTodayDateStr();

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // โหลด queue
  useEffect(() => {
    const colRef = collection(db, "queue");
    let q = query(colRef);

    if (filter === "today") {
      const today = getTodayDateStr();
      q = query(colRef, where("date", "==", today));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (
        filter === "month" ||
        filter === "year" ||
        (selectedYear && selectedMonth !== "")
      ) {
        data = data.filter((d) => {
          if (!d.date) return false;
          const [day, month, year] = d.date.split("/").map((x) => parseInt(x));
          const now = new Date();

          if (
            filter === "month" &&
            month === now.getMonth() + 1 &&
            year === now.getFullYear() + 543
          )
            return true;
          if (filter === "year" && year === now.getFullYear() + 543) return true;
          if (selectedYear && selectedMonth !== "") {
            return (
              year === parseInt(selectedYear) &&
              month === parseInt(selectedMonth) + 1
            );
          }
          return false;
        });
      }

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

      if (filter !== "all") data = data.filter((d) => d.status !== "done");

      if (searchName) {
        data = data.filter((d) =>
          d.name.toLowerCase().includes(searchName.toLowerCase())
        );
      }

      setQueue(data);
    });

    return () => unsubscribe();
  }, [filter, searchName, selectedMonth, selectedYear, sortOrder]);

  // โหลด settings ของวัน
  useEffect(() => {
    const loadSettings = async () => {
      const ref = doc(db, "settings", todayStr);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setAvailableSlots(data.availableSlots || []);
        setDisabledSlots(data.disabledSlots || []);
      } else {
        setAvailableSlots(Object.values(slotConfig).flat());
        setDisabledSlots([]);
      }
    };
    loadSettings();
  }, [todayStr]);

  // --- functions ---
  const addQueue = async () => {
    if (!name || !time) return alert("กรอกข้อมูลให้ครบ");

    await addDoc(collection(db, "queue"), {
      name,
      date: getTodayDateStr(),
      time,
      status: "waiting",
      createdAt: serverTimestamp(),
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

  const togglePeriod = (period) => {
    const slots = slotConfig[period];
    const allIncluded = slots.every((s) => availableSlots.includes(s));
    if (allIncluded) {
      setAvailableSlots((prev) => prev.filter((s) => !slots.includes(s)));
    } else {
      setAvailableSlots((prev) => [...new Set([...prev, ...slots])]);
    }
  };

  const toggleSlot = (slot) => {
    if (!availableSlots.includes(slot)) return;
    if (disabledSlots.includes(slot)) {
      setDisabledSlots((prev) => prev.filter((s) => s !== slot));
    } else {
      setDisabledSlots((prev) => [...prev, slot]);
    }
  };

  const saveSettings = async () => {
    await setDoc(doc(db, "settings", todayStr), {
      availableSlots,
      disabledSlots,
    });
    alert("บันทึกเรียบร้อย");
  };

  // --- UI ---
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

      {/* Admin Settings */}
      <div className="admin-settings" style={{ marginBottom: 24 }}>
        <h2>ตั้งค่าเวลาเปิด-ปิด ({todayStr})</h2>
        {Object.keys(slotConfig).map((period) => {
          const slots = slotConfig[period];
          const allIncluded = slots.every((s) => availableSlots.includes(s));

          return (
            <div key={period} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3>{period}</h3>

                {/* Toggle iOS Style */}
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={allIncluded}
                    onChange={() => togglePeriod(period)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                {slots.map((slot) => {
                  const isAvailable = availableSlots.includes(slot);
                  const isDisabled = disabledSlots.includes(slot);

                  return (
                    <button
                      key={slot}
                      onClick={() => toggleSlot(slot)}
                      className={`slot-button ${!isAvailable ? "off" : ""}`}
                      style={{
                        background: !isAvailable
                          ? "#9ca3af"
                          : isDisabled
                          ? "#ef4444"
                          : "#10b981",
                        color: "#fff",
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <button className="btn btn-add" onClick={saveSettings}>
          💾 บันทึกการตั้งค่า
        </button>
      </div>

      {/* form input + add button */}
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

      {/* filters */}
      <div className="filter-row">
        <div className="filter-bar">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">ทั้งหมด</option>
            <option value="today">วันนี้</option>
            <option value="month">เดือนนี้</option>
            <option value="year">ปีนี้</option>
          </select>

          <select
            className="filter-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">เลือกเดือน</option>
            {[
              "ม.ค.",
              "ก.พ.",
              "มี.ค.",
              "เม.ย.",
              "พ.ค.",
              "มิ.ย.",
              "ก.ค.",
              "ส.ค.",
              "ก.ย.",
              "ต.ค.",
              "พ.ย.",
              "ธ.ค.",
            ].map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">เลือกปี</option>
            <option value="2023">2023</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>

          <select
            className="filter-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
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
            <button
              className="clear-btn"
              onClick={() => setSearchName("")}
              title="ล้าง"
            >
              ❌
            </button>
          )}
        </div>
      </div>

      {/* queue list */}
      <div className="queue-list">
        {queue.map((q) => (
          <div key={q.id} className="card">
            <div className="card-info">
              <b>{q.name}</b>
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
              <button
                className="btn-small btn-done"
                onClick={() => updateStatus(q.id, "done")}
              >
                ✔️ เสร็จแล้ว
              </button>
              <button
                className="btn-small btn-wait"
                onClick={() => updateStatus(q.id, "waiting")}
              >
                ⏳ รอคิว
              </button>
              <button
                className="btn-small btn-delete"
                onClick={() => removeQueue(q.id)}
              >
                ❌ ลบ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTodayDateStr() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

export default App;
