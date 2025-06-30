'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import ThemedLayout from "@/components/ThemedLayout";
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme";
import Papa from "papaparse";
import { AnimatePresence, motion } from "framer-motion";

interface Question {
  question: string;
  choices: string[];
  correctIndex: number;
  subject: string;
  topic: string;
  grade: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export default function AddQuestionPage() {
  const router = useRouter();
  const theme = useUserTheme();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "csv">("manual");
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Form states
  const [formData, setFormData] = useState<Question>({
    question: "",
    choices: ["", "", "", ""],
    correctIndex: 0,
    subject: "",
    topic: "",
    grade: 1,
    difficulty: 'medium',
    explanation: ""
  });

  useEffect(() => {
    // ตรวจสอบ guest mode - ไม่อนุญาตให้ guest เพิ่มข้อสอบ
    const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
    if (isGuestMode) {
      router.push("/dashboard");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
      } else {
        fetchExistingData();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchExistingData = async () => {
    try {
      const snap = await getDocs(collection(db, "questions"));
      const questionList = snap.docs.map(doc => doc.data()) as Question[];
      
      // Extract unique subjects and topics
      const uniqueSubjects = [...new Set(questionList.map(q => q.subject).filter(Boolean))];
      const uniqueTopics = [...new Set(questionList.map(q => q.topic).filter(Boolean))];
      setSubjects(uniqueSubjects);
      setTopics(uniqueTopics);
    } catch (error) {
      console.error("Error fetching existing data:", error);
    }
  };

  const handleSave = async () => {
    try {
      // Enhanced validation
      if (!formData.question.trim()) {
        alert("❌ กรุณากรอกคำถาม");
        return;
      }
      
      if (formData.choices.some(c => !c.trim())) {
        alert("❌ กรุณากรอกตัวเลือกให้ครบทุกข้อ");
        return;
      }
      
      if (!formData.subject.trim()) {
        alert("❌ กรุณากรอกวิชา");
        return;
      }
      
      if (!formData.topic.trim()) {
        alert("❌ กรุณากรอกหัวข้อ");
        return;
      }

      setSaving(true);
      const questionData = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, "questions"), questionData);
      alert("✅ เพิ่มข้อสอบสำเร็จ!");

      resetForm();
      
      // อัปเดตรายการ subjects/topics
      fetchExistingData();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question: "",
      choices: ["", "", "", ""],
      correctIndex: 0,
      subject: "",
      topic: "",
      grade: 1,
      difficulty: 'medium',
      explanation: ""
    });
    setCsvText("");
    setCsvFile(null);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvText || !formData.subject.trim() || !formData.topic.trim()) {
      alert("❌ กรุณากรอกวิชา และหัวข้อก่อน import CSV");
      return;
    }

    setSaving(true);
    try {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const data = results.data as any[];
          let successCount = 0;

          for (const row of data) {
            if (!row.question || !row.choice1 || !row.correctIndex) continue;

            try {
              await addDoc(collection(db, "questions"), {
                question: row.question,
                choices: [row.choice1, row.choice2 || "", row.choice3 || "", row.choice4 || ""],
                correctIndex: Number(row.correctIndex) - 1,
                subject: formData.subject,
                topic: formData.topic,
                grade: formData.grade,
                difficulty: formData.difficulty,
                explanation: row.explanation || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              successCount++;
            } catch (error) {
              console.error("Error adding question:", error);
            }
          }

          alert(`🚀 นำเข้าสำเร็จ ${successCount} ข้อสอบ!`);
          resetForm();
          fetchExistingData();
        },
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      alert("❌ เกิดข้อผิดพลาดในการนำเข้า CSV");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/quiz/manage")}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: theme.textColor + '10' }}
              title="กลับ"
            >
              <svg className="w-6 h-6" style={{ color: theme.textColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: theme.textColor }}>➕ เพิ่มข้อสอบใหม่</h1>
              <p style={{ color: theme.textColor + '80' }}>เพิ่มข้อสอบทีละข้อ หรือนำเข้าจากไฟล์ CSV</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div 
            className="flex justify-center gap-4 p-4 rounded-xl border"
            style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value="manual"
                checked={createMode === "manual"}
                onChange={() => setCreateMode("manual")}
                className="text-blue-500 scale-125"
              />
              <span className="text-lg font-medium" style={{ color: theme.textColor }}>✍️ พิมพ์เองทีละข้อ</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value="csv"
                checked={createMode === "csv"}
                onChange={() => setCreateMode("csv")}
                className="text-blue-500 scale-125"
              />
              <span className="text-lg font-medium" style={{ color: theme.textColor }}>📥 นำเข้า CSV</span>
            </label>
          </div>
        </div>

        {/* Main Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={createMode}
            initial={{ opacity: 0, x: createMode === "manual" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: createMode === "manual" ? 20 : -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-8 shadow-lg border"
            style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
          >
            {/* Common fields: Subject, Topic, Grade, Difficulty */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📚 วิชา</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => {
                      if (e.target.value === "__new") {
                        const custom = prompt("พิมพ์ชื่อวิชาใหม่:");
                        if (custom) setFormData({...formData, subject: custom});
                      } else {
                        setFormData({...formData, subject: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                  >
                    <option value="">-- เลือกวิชา --</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                    <option value="__new">➕ เพิ่มวิชาใหม่...</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📖 หัวข้อ</label>
                  <select
                    value={formData.topic}
                    onChange={(e) => {
                      if (e.target.value === "__new") {
                        const custom = prompt("พิมพ์ชื่อหัวข้อใหม่:");
                        if (custom) setFormData({...formData, topic: custom});
                      } else {
                        setFormData({...formData, topic: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                  >
                    <option value="">-- เลือกหัวข้อ --</option>
                    {topics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                    <option value="__new">➕ เพิ่มหัวข้อใหม่...</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>🎓 ระดับชั้น</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                      <option key={grade} value={grade}>ป.{grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>⭐ ระดับความยาก</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard'})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                  >
                    <option value="easy">🟢 ง่าย</option>
                    <option value="medium">🟡 ปานกลาง</option>
                    <option value="hard">🔴 ยาก</option>
                  </select>
                </div>
              </div>

              {/* Manual Mode Fields */}
              {createMode === "manual" && (
                <>
                  {/* Question */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>❓ คำถาม</label>
                    <textarea
                      value={formData.question}
                      onChange={(e) => setFormData({...formData, question: e.target.value})}
                      className="w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      rows={4}
                      placeholder="กรอกคำถาม..."
                    />
                  </div>

                  {/* Choices */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📝 ตัวเลือก</label>
                    <div className="space-y-3">
                      {formData.choices.map((choice, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={formData.correctIndex === index}
                              onChange={() => setFormData({...formData, correctIndex: index})}
                              className="mr-3 scale-125"
                            />
                            <span className="text-lg font-bold w-8" style={{ color: theme.textColor }}>
                              {String.fromCharCode(65 + index)}.
                            </span>
                          </div>
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) => {
                              const newChoices = [...formData.choices];
                              newChoices[index] = e.target.value;
                              setFormData({...formData, choices: newChoices});
                            }}
                            className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                            style={{ 
                              ...getBackgroundStyle(theme.bgColor),
                              color: theme.textColor,
                              borderColor: theme.textColor + '30'
                            }}
                            placeholder={`ตัวเลือก ${String.fromCharCode(65 + index)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>💡 คำอธิบาย (ไม่บังคับ)</label>
                    <textarea
                      value={formData.explanation || ""}
                      onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                      className="w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      rows={3}
                      placeholder="อธิบายเหตุผลของคำตอบที่ถูก..."
                    />
                  </div>
                </>
              )}

              {/* CSV Mode Fields */}
              {createMode === "csv" && (
                <div className="space-y-6">
                  <div 
                    className="p-6 rounded-xl border-2 border-dashed"
                    style={{ borderColor: theme.textColor + '30', backgroundColor: theme.textColor + '05' }}
                  >
                    <h3 className="text-lg font-bold mb-3" style={{ color: theme.textColor }}>📄 รูปแบบไฟล์ CSV</h3>
                    <p className="text-sm mb-3" style={{ color: theme.textColor + '80' }}>
                      ไฟล์ CSV ต้องมีคอลัมน์: <code>question, choice1, choice2, choice3, choice4, correctIndex, explanation</code>
                    </p>
                    <p className="text-sm" style={{ color: theme.textColor + '60' }}>
                      <strong>correctIndex:</strong> 1=choice1, 2=choice2, 3=choice3, 4=choice4
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📁 เลือกไฟล์ CSV</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                    />
                  </div>

                  {csvFile && (
                    <div 
                      className="p-4 rounded-xl border"
                      style={{ backgroundColor: theme.textColor + '10', borderColor: theme.textColor + '20' }}
                    >
                      <p className="text-lg" style={{ color: theme.textColor }}>
                        📄 ไฟล์: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                {createMode === "manual" ? (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกข้อสอบ"}
                  </button>
                ) : (
                  <button
                    onClick={handleCsvImport}
                    disabled={saving || !csvText}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "⏳ กำลังนำเข้า..." : "📤 นำเข้า CSV"}
                  </button>
                )}
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="bg-gray-500 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
                >
                  🔄 ล้างข้อมูล
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Success Message */}
        {saving && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div 
              className="rounded-2xl p-8 text-center shadow-2xl"
              style={{ ...getBackgroundStyle(theme.bgColor) }}
            >
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-xl font-medium" style={{ color: theme.textColor }}>
                {createMode === "manual" ? "กำลังบันทึกข้อสอบ..." : "กำลังนำเข้าข้อมูล..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </ThemedLayout>
  );
}
