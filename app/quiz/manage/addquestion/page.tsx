'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from "firebase/firestore";
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
  grade: string; // เปลี่ยนจาก number เป็น string
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function AddQuestionPage() {
  const router = useRouter();
  const { theme } = useUserTheme();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "csv" | "ai">("manual");
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");
  const [grades, setGrades] = useState<string[]>(["ป.4", "ป.5", "ป.6"]);

  // Form states
  const [formData, setFormData] = useState<Question>({
    question: "",
    choices: ["", "", "", ""],
    correctIndex: 0,
    subject: "",
    topic: "",
    grade: "ป.4", // เปลี่ยนเป็น string
    difficulty: 'medium',
    explanation: ""
  });

  // AI Generation states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [aiQuestionType, setAiQuestionType] = useState<"general" | "calculation" | "application">("general");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUserEmail(u.email || "");
        
        // ดึงข้อมูลบทบาทผู้ใช้
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData?.role || "user");
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
        
        fetchExistingData();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchExistingData = async () => {
    try {
      // Fetch from Firestore collections
      const [subjectsSnap, topicsSnap, gradesSnap, questionsSnap] = await Promise.all([
        getDocs(collection(db, "subjects")),
        getDocs(collection(db, "topics")),
        getDocs(collection(db, "grades")),
        getDocs(collection(db, "questions"))
      ]);

      // Get all questions
      const questionList = questionsSnap.docs.map(doc => doc.data()) as Question[];

      // Subjects
      const firestoreSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      const usedSubjects = new Set(questionList.map(q => q.subject).filter(Boolean));
      // Remove unused subjects from Firestore
      await Promise.all(
        firestoreSubjects
          .filter(s => !usedSubjects.has(s.name))
          .map(async s => {
            await deleteDoc(doc(db, "subjects", s.id));
          })
      );
      // Only show subjects that are used
      const allSubjects = Array.from(usedSubjects);

      // Topics
      const firestoreTopics = topicsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      const usedTopics = new Set(questionList.map(q => q.topic).filter(Boolean));
      // Remove unused topics from Firestore
      await Promise.all(
        firestoreTopics
          .filter(t => !usedTopics.has(t.name))
          .map(async t => {
            await deleteDoc(doc(db, "topics", t.id));
          })
      );
      // Only show topics that are used
      const allTopics = Array.from(usedTopics);

      // Grades
      const firestoreGrades = gradesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      const usedGrades = new Set(questionList.map(q => q.grade).filter(Boolean));
      // Remove unused grades from Firestore
      await Promise.all(
        firestoreGrades
          .filter(g => !usedGrades.has(g.name))
          .map(async g => {
            await deleteDoc(doc(db, "grades", g.id));
          })
      );
      // Merge Firestore grades with used grades and default grades
      const defaultGrades = ["ป.4", "ป.5", "ป.6"];
      const allGrades = [...new Set([...defaultGrades, ...Array.from(usedGrades)])];

      setSubjects(allSubjects);
      setTopics(allTopics);
      setGrades(allGrades);
    } catch (error) {
      console.error("Error fetching existing data:", error);
    }
  };

  const addNewSubject = async (subjectName: string) => {
    try {
      // Add to Firestore subjects collection
      await addDoc(collection(db, "subjects"), {
        name: subjectName,
        createdBy: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setSubjects(prev => [...prev, subjectName]);
      setFormData({...formData, subject: subjectName});
      
      console.log("Subject added successfully:", subjectName);
    } catch (error) {
      console.error("Error adding subject:", error);
      alert("❌ เกิดข้อผิดพลาดในการเพิ่มวิชา");
    }
  };

  const addNewTopic = async (topicName: string) => {
    try {
      // Add to Firestore topics collection
      await addDoc(collection(db, "topics"), {
        name: topicName,
        createdBy: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTopics(prev => [...prev, topicName]);
      setFormData({...formData, topic: topicName});
      
      console.log("Topic added successfully:", topicName);
    } catch (error) {
      console.error("Error adding topic:", error);
      alert("❌ เกิดข้อผิดพลาดในการเพิ่มหัวข้อ");
    }
  };

  const addNewGrade = async (gradeName: string) => {
    try {
      // Add to Firestore grades collection
      await addDoc(collection(db, "grades"), {
        name: gradeName,
        createdBy: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setGrades(prev => [...prev, gradeName]);
      setFormData({...formData, grade: gradeName});
      
      console.log("Grade added successfully:", gradeName);
    } catch (error) {
      console.error("Error adding grade:", error);
      alert("❌ เกิดข้อผิดพลาดในการเพิ่มระดับชั้น");
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
        createdBy: userEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
      grade: "ป.4",
      difficulty: 'medium',
      explanation: ""
    });
    // Don't reset grades - keep existing grades from Firestore
    setCsvText("");
    setCsvFile(null);
    
    // Reset AI states
    setAiPrompt("");
    setAiContent("");
    setGeneratedQuestions([]);
    setQuestionCount(5);
    setAiQuestionType("general");
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
      interface CSVRow {
        question: string;
        choice1: string;
        choice2: string;
        choice3: string;
        choice4: string;
        correctIndex: string;
        explanation?: string;
        [key: string]: any;
      }
      
      const results = await new Promise<Papa.ParseResult<CSVRow>>((resolve, reject) => {
        Papa.parse<CSVRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results),
          error: (error: Error) => {
            console.error("CSV parsing error:", error);
            alert(`❌ เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: ${error.message}`);
            setSaving(false);
            reject(error);
          }
        });
      });

      const data = results.data;
      
      // Check if CSV is empty or has no valid data
      if (!data || data.length === 0) {
        alert("❌ ไม่พบข้อมูลในไฟล์ CSV หรือรูปแบบไม่ถูกต้อง");
        setSaving(false);
        return;
      }
      
      // Verify CSV structure (column headers)
      const requiredColumns = ['question', 'choice1', 'choice2', 'choice3', 'choice4', 'correctIndex'];
      const missingColumns = requiredColumns.filter(col => 
        !Object.keys(data[0]).some(key => key.toLowerCase() === col.toLowerCase())
      );
      
      if (missingColumns.length > 0) {
        alert(`❌ ไฟล์ CSV ไม่มีคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}`);
        setSaving(false);
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      let validationErrors: string[] = [];
      let rowIndex = 0;

      for (const row of data) {
        rowIndex++;
        let rowHasError = false;
        
        // Check for missing required fields
        if (!row.question || !row.question.trim()) {
          validationErrors.push(`คำถามที่ ${rowIndex}: คำถามว่างเปล่า`);
          rowHasError = true;
        }
        
        // Check for missing choices
        if (!row.choice1 || !row.choice1.trim()) {
          validationErrors.push(`คำถามที่ ${rowIndex}: ตัวเลือกที่ 1 ว่างเปล่า`);
          rowHasError = true;
        }
        
        if (!row.choice2 || !row.choice2.trim()) {
          validationErrors.push(`คำถามที่ ${rowIndex}: ตัวเลือกที่ 2 ว่างเปล่า`);
          rowHasError = true;
        }
        
        if (!row.choice3 || !row.choice3.trim()) {
          validationErrors.push(`คำถามที่ ${rowIndex}: ตัวเลือกที่ 3 ว่างเปล่า`);
          rowHasError = true;
        }
        
        if (!row.choice4 || !row.choice4.trim()) {
          validationErrors.push(`คำถามที่ ${rowIndex}: ตัวเลือกที่ 4 ว่างเปล่า`);
          rowHasError = true;
        }
        
        // Check for valid correctIndex
        if (!row.correctIndex) {
          validationErrors.push(`คำถามที่ ${rowIndex}: ไม่ได้ระบุคำตอบที่ถูกต้อง`);
          rowHasError = true;
        } else if (!["1", "2", "3", "4"].includes(String(row.correctIndex))) {
          validationErrors.push(`คำถามที่ ${rowIndex}: คำตอบที่ถูกต้องต้องเป็น 1, 2, 3, หรือ 4 เท่านั้น (พบค่า "${row.correctIndex}")`);
          rowHasError = true;
        }
        
        // Skip this row if any validation errors were found
        if (rowHasError) {
          errorCount++;
          continue;
        }

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
            createdBy: userEmail,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          successCount++;
        } catch (error) {
          console.error("Error adding question from CSV row:", error);
          errorCount++;
        }
      }

      // Display validation errors if any exist
      if (validationErrors.length > 0) {
        // Limit to first 5 errors to prevent excessive alert size
        const displayErrors = validationErrors.slice(0, 5);
        let errorMessage = `❌ พบข้อผิดพลาดในการนำเข้า ${errorCount} ข้อ:\n\n`;
        errorMessage += displayErrors.join('\n');
        
        if (validationErrors.length > 5) {
          errorMessage += `\n\n...และอีก ${validationErrors.length - 5} ข้อผิดพลาด`;
        }
        
        if (successCount > 0) {
          errorMessage += `\n\n✅ นำเข้าสำเร็จ ${successCount} ข้อสอบ`;
        }
        
        alert(errorMessage);
      } else {
        alert(`🚀 นำเข้าสำเร็จ ${successCount} ข้อสอบ!`);
      }
      
      resetForm();
      fetchExistingData();

    } catch (error) {
      console.error("Error importing CSV:", error);
      alert("❌ เกิดข้อผิดพลาดในการนำเข้า CSV, กรุณาตรวจสอบรูปแบบไฟล์");
    } finally {
      setSaving(false);
    }
  };

  const generateQuestionsWithAI = async () => {
    if (!formData.subject.trim() || !formData.topic.trim()) {
      alert("❌ กรุณากรอกวิชาและหัวข้อก่อนสร้างข้อสอบด้วย AI");
      return;
    }

    if (!aiPrompt.trim()) {
      alert("❌ กรุณาระบุหัวข้อหรือเนื้อหาที่ต้องการสร้างข้อสอบ");
      return;
    }

    setIsGenerating(true);
    try {
      const questionTypeMap = {
        general: "คำถามทั่วไป เน้นความเข้าใจแนวคิด",
        calculation: "คำถามคำนวณ เน้นการประยุกต์สูตร",
        application: "คำถามประยุกต์ เน้นการนำไปใช้จริง"
      };

      const prompt = `สร้างข้อสอบปรนัย ${questionCount} ข้อ สำหรับวิชา "${formData.subject}" หัวข้อ "${formData.topic}" ระดับชั้น "${formData.grade}" ระดับความยาก "${formData.difficulty}"

ประเภทคำถาม: ${questionTypeMap[aiQuestionType]}

หัวข้อ/เนื้อหา: ${aiPrompt}

${aiContent ? `เนื้อหาเพิ่มเติม: ${aiContent}` : ''}

กรุณาตอบกลับในรูปแบบ JSON ดังนี้:
{
  "questions": [
    {
      "question": "คำถาม",
      "choices": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
      "correctIndex": 0,
      "explanation": "คำอธิบาย"
    }
  ]
}

ข้อกำหนด:
- คำถามต้องชัดเจน เข้าใจง่าย เหมาะกับระดับชั้น
- ตัวเลือกทั้ง 4 ต้องสมเหตุสมผล
- correctIndex เป็นดัชนีของคำตอบที่ถูก (0-3)
- คำอธิบายต้องอธิบายเหตุผลของคำตอบ
- ใช้ภาษาไทย`;

      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.questions && Array.isArray(data.questions)) {
        const validQuestions = data.questions.filter((q: any) => 
          q.question && q.choices && q.choices.length === 4 && 
          typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
        );
        
        setGeneratedQuestions(validQuestions.map((q: any) => ({
          ...q,
          subject: formData.subject,
          topic: formData.topic,
          grade: formData.grade,
          difficulty: formData.difficulty,
        })));
        
        alert(`✅ สร้างข้อสอบสำเร็จ ${validQuestions.length} ข้อ!`);
      } else {
        throw new Error("รูปแบบข้อมูลจาก AI ไม่ถูกต้อง");
      }

    } catch (error) {
      console.error("Error generating questions:", error);
      alert("❌ เกิดข้อผิดพลาดในการสร้างข้อสอบด้วย AI กรุณาลองใหม่");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedQuestions = async () => {
    if (generatedQuestions.length === 0) {
      alert("❌ ไม่มีข้อสอบที่สร้างแล้วให้บันทึก");
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      
      for (const question of generatedQuestions) {
        try {
          await addDoc(collection(db, "questions"), {
            ...question,
            createdBy: userEmail,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          successCount++;
        } catch (error) {
          console.error("Error saving question:", error);
        }
      }

      alert(`✅ บันทึกข้อสอบสำเร็จ ${successCount} ข้อ!`);
      setGeneratedQuestions([]);
      resetForm();
      fetchExistingData();

    } catch (error) {
      console.error("Error saving generated questions:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
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
                value="ai"
                checked={createMode === "ai"}
                onChange={() => setCreateMode("ai")}
                className="text-blue-500 scale-125"
              />
              <span className="text-lg font-medium" style={{ color: theme.textColor }}>🤖 สร้างด้วย AI</span>
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
                        if (custom && custom.trim()) {
                          addNewSubject(custom.trim());
                        }
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
                        if (custom && custom.trim()) {
                          addNewTopic(custom.trim());
                        }
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
                    onChange={(e) => {
                      if (e.target.value === "__new") {
                        const custom = prompt("พิมพ์ระดับชั้นใหม่ (เช่น ป.4, ม.1, มหาลัย ฯลฯ):");
                        const trimmed = custom ? custom.trim() : "";
                        if (trimmed && !grades.includes(trimmed)) {
                          addNewGrade(trimmed);
                        } else if (trimmed && grades.includes(trimmed)) {
                          setFormData({...formData, grade: trimmed});
                        }
                      } else {
                        setFormData({...formData, grade: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                  >
                    {grades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                    <option value="__new">➕ เพิ่มระดับชั้นอื่นๆ...</option>
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
                          <span className="text-lg font-bold w-8" style={{ color: theme.textColor }}>
                            {String.fromCharCode(65 + index)}.
                          </span>
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

                  {/* Correct Answer Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>✅ คำตอบที่ถูกต้อง</label>
                    <select
                      value={formData.correctIndex}
                      onChange={(e) => setFormData({ ...formData, correctIndex: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                    >
                      {formData.choices.map((choice, index) => (
                        <option key={index} value={index}>
                          {String.fromCharCode(65 + index)}. {choice || `ตัวเลือก ${String.fromCharCode(65 + index)}`}
                        </option>
                      ))}
                    </select>
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

              {/* AI Mode Fields */}
              {createMode === "ai" && (
                <div className="space-y-6">
                  <div 
                    className="p-6 rounded-xl border-2 border-dashed"
                    style={{ borderColor: theme.textColor + '30', backgroundColor: theme.textColor + '05' }}
                  >
                    <h3 className="text-lg font-bold mb-3" style={{ color: theme.textColor }}>🤖 สร้างข้อสอบด้วย AI</h3>
                    <p className="text-sm mb-3" style={{ color: theme.textColor + '80' }}>
                      ระบุหัวข้อหรือเนื้อหาที่ต้องการสร้างข้อสอบ AI จะสร้างข้อสอบปรนัยให้อัตโนมัติ
                    </p>
                    
                    <div className="bg-white bg-opacity-10 rounded-lg p-3 mb-3">
                      <h4 className="font-bold mb-2" style={{ color: theme.textColor }}>💡 เทคนิคการใช้งาน:</h4>
                      <ul className="list-disc pl-5 space-y-1" style={{ color: theme.textColor + '80' }}>
                        <li>ระบุหัวข้อให้ชัดเจน เช่น "สมการเชิงเส้น" "ประวัติศาสตร์ไทย สมัยสุโขทัย"</li>
                        <li>เพิ่มเนื้อหาเพื่อให้ AI เข้าใจบริบทมากขึ้น</li>
                        <li>เลือกประเภทคำถามให้เหมาะกับวิชาและหัวข้อ</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>🎯 ประเภทคำถาม</label>
                      <select
                        value={aiQuestionType}
                        onChange={(e) => setAiQuestionType(e.target.value as "general" | "calculation" | "application")}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      >
                        <option value="general">🧠 คำถามทั่วไป (ความเข้าใจ)</option>
                        <option value="calculation">🔢 คำถามคำนวณ (สูตร/การคิด)</option>
                        <option value="application">🎯 คำถามประยุกต์ (การใช้จริง)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📊 จำนวนข้อสอบ</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      >
                        <option value={3}>3 ข้อ</option>
                        <option value={5}>5 ข้อ</option>
                        <option value={10}>10 ข้อ</option>
                        <option value={15}>15 ข้อ</option>
                        <option value={20}>20 ข้อ</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📝 หัวข้อที่ต้องการสร้างข้อสอบ</label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      rows={3}
                      placeholder="เช่น: สมการเชิงเส้น การแก้สมการ ax + b = c, การหาค่า x..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📚 เนื้อหาเพิ่มเติม (ไม่บังคับ)</label>
                    <textarea
                      value={aiContent}
                      onChange={(e) => setAiContent(e.target.value)}
                      className="w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      rows={4}
                      placeholder="วางเนื้อหาจากตำรา, เอกสาร หรือใส่รายละเอียดเพิ่มเติมที่ต้องการให้ AI ใช้สร้างข้อสอบ..."
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={generateQuestionsWithAI}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? "🤖 AI กำลังสร้าง..." : "✨ สร้างข้อสอบด้วย AI"}
                    </button>
                  </div>

                  {/* Generated Questions Preview */}
                  {generatedQuestions.length > 0 && (
                    <div 
                      className="p-6 rounded-xl border"
                      style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
                    >
                      <h4 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>📋 ข้อสอบที่สร้างแล้ว ({generatedQuestions.length} ข้อ)</h4>
                      <div className="max-h-96 overflow-y-auto">
                        {generatedQuestions.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-10">ยังไม่มีข้อสอบที่สร้างโดย AI</p>
                        ) : (
                          <ol className="list-decimal pl-5 space-y-4">
                            {generatedQuestions.map((q, index) => (
                              <li key={index} className="text-sm border-b pb-3" style={{ color: theme.textColor, borderColor: theme.textColor + '20' }}>
                                <div className="font-medium mb-2">{q.question}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                  {q.choices.map((choice, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <span 
                                        className={`font-bold px-2 py-1 rounded text-xs ${i === q.correctIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                                      >
                                        {String.fromCharCode(65 + i)}
                                      </span>
                                      <span style={{ color: theme.textColor + '90' }}>{choice}</span>
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <div className="text-xs p-2 rounded" style={{ backgroundColor: theme.textColor + '10', color: theme.textColor + '80' }}>
                                    💡 {q.explanation}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                      ไฟล์ CSV <strong>ต้องมีคอลัมน์</strong>: <code>question, choice1, choice2, choice3, choice4, correctIndex, explanation</code>
                    </p>
                    
                    <div className="bg-white bg-opacity-10 rounded-lg p-3 mb-3">
                      <h4 className="font-bold mb-2" style={{ color: theme.textColor }}>🔍 ข้อกำหนด CSV:</h4>
                      <ul className="list-disc pl-5 space-y-1" style={{ color: theme.textColor + '80' }}>
                        <li><strong>question:</strong> ต้องมีคำถาม ห้ามว่างเปล่า</li>
                        <li><strong>choice1-choice4:</strong> ทั้ง 4 ตัวเลือกต้องมีค่า ห้ามว่างเปล่า</li>
                        <li><strong>correctIndex:</strong> <span className="font-bold">ต้องมีค่าเป็น 1, 2, 3, หรือ 4 เท่านั้น</span> (1=choice1, 2=choice2, 3=choice3, 4=choice4)</li>
                        <li><strong>explanation:</strong> คำอธิบายเพิ่มเติม (ไม่บังคับ)</li>
                      </ul>
                    </div>
                    
                    <p className="text-sm" style={{ color: theme.textColor + '60' }}>
                      💡 <strong>ทุกข้อที่ผ่านการตรวจสอบจะถูกนำเข้า</strong> ข้อที่ไม่ผ่านจะถูกข้าม และแสดงข้อผิดพลาด
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

              {/* AI Mode Fields */}
              {createMode === "ai" && (
                <div className="space-y-6">
                  {/* Subject, Topic, Grade - Readonly */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📚 วิชา</label>
                      <input
                        type="text"
                        value={formData.subject}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 text-gray-500 text-lg cursor-not-allowed"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📖 หัวข้อ</label>
                      <input
                        type="text"
                        value={formData.topic}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 text-gray-500 text-lg cursor-not-allowed"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>🎓 ระดับชั้น</label>
                      <input
                        type="text"
                        value={formData.grade}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 text-gray-500 text-lg cursor-not-allowed"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>⭐ ระดับความยาก</label>
                      <input
                        type="text"
                        value={formData.difficulty}
                        readOnly
                        className="w-full px-4 py-3 border rounded-xl bg-gray-100 text-gray-500 text-lg cursor-not-allowed"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      />
                    </div>
                  </div>

                  {/* AI Prompt and Options */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>🧠 หัวข้อ/เนื้อหาสำหรับ AI</label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full px-4 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                      rows={3}
                      placeholder="ระบุหัวข้อหรือเนื้อหาที่ต้องการสร้างข้อสอบ"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📊 จำนวนข้อสอบที่ต้องการสร้าง</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Math.min(20, Math.max(1, Number(e.target.value))))}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>⚙️ ประเภทคำถาม</label>
                      <select
                        value={aiQuestionType}
                        onChange={(e) => setAiQuestionType(e.target.value as "general" | "calculation" | "application")}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                      >
                        <option value="general">คำถามทั่วไป</option>
                        <option value="calculation">คำถามคำนวณ</option>
                        <option value="application">คำถามประยุกต์</option>
                      </select>
                    </div>
                  </div>

                  {/* Generated Questions Preview */}
                  <div>
                    <label className="block text-sm font-medium mb-3" style={{ color: theme.textColor + '80' }}>📋 ตัวอย่างข้อสอบที่สร้างโดย AI</label>
                    <div className="bg-white bg-opacity-10 rounded-lg p-4 max-h-60 overflow-y-auto" style={{ borderColor: theme.textColor + '20' }}>
                      {generatedQuestions.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-10">ยังไม่มีข้อสอบที่สร้างโดย AI</p>
                      ) : (
                        <ol className="list-decimal pl-5 space-y-3">
                          {generatedQuestions.map((q, index) => (
                            <li key={index} className="text-sm" style={{ color: theme.textColor }}>
                              <div className="font-medium">{q.question}</div>
                              <div className="flex gap-2">
                                {q.choices.map((choice, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="font-bold" style={{ color: theme.textColor }}>
                                      {String.fromCharCode(65 + i)}.
                                    </span>
                                    <span className="text-gray-300">{choice}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-gray-400 text-xs mt-1">
                                คำตอบที่ถูกต้อง: {String.fromCharCode(65 + q.correctIndex)}.
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
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
                ) : createMode === "ai" ? (
                  generatedQuestions.length > 0 && (
                    <button
                      onClick={saveGeneratedQuestions}
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "⏳ กำลังบันทึก..." : `💾 บันทึกข้อสอบ ${generatedQuestions.length} ข้อ`}
                    </button>
                  )
                ) : createMode === "csv" ? (
                  <button
                    onClick={handleCsvImport}
                    disabled={saving || !csvText}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "⏳ กำลังนำเข้า..." : "📤 นำเข้า CSV"}
                  </button>
                ) : (
                  <button
                    onClick={saveGeneratedQuestions}
                    disabled={saving || generatedQuestions.length === 0}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-8 rounded-xl font-medium text-lg shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกข้อสอบที่สร้างโดย AI"}
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
