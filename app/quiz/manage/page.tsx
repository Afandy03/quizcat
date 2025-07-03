'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import ThemedLayout from "@/components/ThemedLayout";
import { useUserTheme, getBackgroundStyle } from "@/lib/useTheme";

interface Question {
  id?: string;
  question: string;
  choices: string[];
  correctIndex: number;
  subject: string;
  topic: string;
  grade: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

export default function QuizManagePage() {
  const router = useRouter();
  const { theme, isLoading } = useUserTheme();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const [userEmail, setUserEmail] = useState<string>("");

  // Form states for editing only
  const [formData, setFormData] = useState<Question>({
    question: "",
    choices: ["", "", "", ""],
    correctIndex: 0,
    subject: "",
    topic: "",
    grade: "1",
    difficulty: 'medium',
    explanation: ""
  });

  // Handle ESC key to close edit modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingQuestion) {
        setEditingQuestion(null);
        resetForm();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [editingQuestion]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
      } else {
        // เก็บอีเมลผู้ใช้
        setUserEmail(u.email || "");
        
        // ดึงข้อมูลบทบาทผู้ใช้จาก Firestore
        try {
          const userDoc = await getDocs(collection(db, "users"));
          const userData = userDoc.docs.find(doc => doc.id === u.uid)?.data();
          if (userData) {
            setUserRole(userData?.role || "user");
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
        
        fetchQuestions();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "questions"));
      const questionList = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Question[];
      
      setQuestions(questionList);
      
      // Extract unique subjects and topics from actual data
      const uniqueSubjects = [...new Set(questionList.map(q => q.subject).filter(Boolean))];
      const uniqueTopics = [...new Set(questionList.map(q => q.topic).filter(Boolean))];
      setSubjects(uniqueSubjects);
      setTopics(uniqueTopics);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
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
        updatedAt: new Date(),
        createdBy: userEmail
      };

      if (editingQuestion?.id) {
        // Update existing question
        await updateDoc(doc(db, "questions", editingQuestion.id), questionData);
        alert("✅ แก้ไขข้อสอบสำเร็จ!");
      }

      setEditingQuestion(null);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบนี้?")) return;
    
    try {
      await deleteDoc(doc(db, "questions", questionId));
      alert("✅ ลบข้อสอบสำเร็จ!");
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("❌ เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleDeleteSubject = async (subject: string) => {
    if (userRole !== "admin") {
      alert("❌ คุณไม่มีสิทธิ์ลบวิชาทั้งหมด เฉพาะ Admin เท่านั้นที่สามารถลบวิชาได้");
      return;
    }
    
    // ตรวจสอบจำนวนข้อสอบในวิชานี้
    const subjectQuestions = questions.filter(q => q.subject === subject);
    const questionCount = subjectQuestions.length;
    
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบทั้งหมดในวิชา "${subject}" จำนวน ${questionCount} ข้อ? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }
    
    // ขอคำยืนยันอีกครั้ง
    if (!confirm(`⚠️ โปรดยืนยันอีกครั้ง: ต้องการลบข้อสอบทั้งหมดในวิชา "${subject}" จำนวน ${questionCount} ข้อใช่หรือไม่?`)) {
      return;
    }
    
    try {
      setLoading(true);
      // ลบข้อสอบทีละข้อ
      for (const question of subjectQuestions) {
        if (question.id) {
          await deleteDoc(doc(db, "questions", question.id));
        }
      }
      
      alert(`✅ ลบข้อสอบในวิชา "${subject}" ทั้งหมด ${questionCount} ข้อสำเร็จ!`);
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting subject questions:", error);
      alert("❌ เกิดข้อผิดพลาดในการลบ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNoSubjectQuestions = async () => {
    if (userRole !== "admin") {
      alert("❌ คุณไม่มีสิทธิ์ลบข้อสอบเหล่านี้ เฉพาะ Admin เท่านั้นที่สามารถลบได้");
      return;
    }
    
    // หาข้อสอบที่ไม่มีวิชา
    const noSubjectQuestions = questions.filter(q => !q.subject);
    const questionCount = noSubjectQuestions.length;
    
    if (questionCount === 0) {
      alert("ไม่พบข้อสอบที่ไม่มีวิชา");
      return;
    }
    
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบที่ไม่มีวิชาทั้งหมด จำนวน ${questionCount} ข้อ? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      return;
    }
    
    // ขอคำยืนยันอีกครั้ง
    if (!confirm(`⚠️ โปรดยืนยันอีกครั้ง: ต้องการลบข้อสอบที่ไม่มีวิชาทั้งหมด จำนวน ${questionCount} ข้อใช่หรือไม่?`)) {
      return;
    }
    
    try {
      setLoading(true);
      // ลบข้อสอบทีละข้อ
      for (const question of noSubjectQuestions) {
        if (question.id) {
          await deleteDoc(doc(db, "questions", question.id));
        }
      }
      
      alert(`✅ ลบข้อสอบที่ไม่มีวิชาทั้งหมด ${questionCount} ข้อสำเร็จ!`);
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting no subject questions:", error);
      alert("❌ เกิดข้อผิดพลาดในการลบ");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setFormData(question);
    setEditingQuestion(question);
  };

  const resetForm = () => {
    setFormData({
      question: "",
      choices: ["", "", "", ""],
      correctIndex: 0,
      subject: "",
      topic: "",
      grade: "1",
      difficulty: 'medium',
      explanation: ""
    });
  };

  const filteredQuestions = questions.filter(q => {
    const questionText = q.question || '';
    const subjectText = q.subject || '';
    const topicText = q.topic || '';
    
    const matchesSearch = questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subjectText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topicText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filterSubject || q.subject === filterSubject;
    const matchesTopic = !filterTopic || q.topic === filterTopic;
    const matchesGrade = !filterGrade || q.grade === filterGrade;
    
    return matchesSearch && matchesSubject && matchesTopic && matchesGrade;
  });

  // Calculate real statistics
  const getStatistics = () => {
    const totalQuestions = questions.length;
    
    // ระบุค่า "ไม่มีวิชา" สำหรับข้อมูลที่ subject เป็น undefined หรือค่าว่าง
    const questionsWithLabels = questions.map(q => ({
      ...q,
      subject: q.subject || "ไม่มีวิชา"
    }));
    
    const uniqueSubjects = [...new Set(questionsWithLabels.map(q => q.subject).filter(Boolean))];
    const uniqueTopics = [...new Set(questions.map(q => q.topic).filter(Boolean))];
    // Include all grades (string values) that exist in questions
    const validGrades = questions.map(q => q.grade).filter(g => g != null && g !== "").map(g => String(g));
    const uniqueGrades = [...new Set(validGrades)];

    const difficultyStats = questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ใช้ questionsWithLabels ที่แทนที่ undefined ด้วย "ไม่มีวิชา" แล้ว
    const subjectStats = questionsWithLabels.reduce((acc, q) => {
      acc[q.subject] = (acc[q.subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count all grades (including string values)
    const gradeStats = questions.reduce((acc, q) => {
      if (q.grade != null && q.grade !== "") {
        const gradeKey = String(q.grade);
        acc[gradeKey] = (acc[gradeKey] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    // นับจำนวนข้อสอบที่ไม่มีวิชา
    const noSubjectCount = questions.filter(q => !q.subject).length;

    return {
      totalQuestions,
      uniqueSubjects: uniqueSubjects.length,
      uniqueTopics: uniqueTopics.length,
      uniqueGrades: uniqueGrades.length,
      filteredCount: filteredQuestions.length,
      difficultyStats,
      subjectStats,
      gradeStats,
      availableGrades: uniqueGrades.sort((a, b) => {
        // Try to sort numerically first, fall back to string sort
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.localeCompare(b);
      }),
      noSubjectCount
    };
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: theme.textColor + '80' }}>กำลังโหลดข้อมูล...</p>
        </div>
      </ThemedLayout>
    );
  }

  return (
    <ThemedLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: theme.textColor }}>🗂️ จัดการข้อสอบ</h1>
              <p style={{ color: theme.textColor + '80' }}>จัดการข้อสอบทั้งหมดในระบบ</p>
            </div>
            <button
              onClick={() => router.push("/quiz/manage/addquestion")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200"
            >
              ➕ เพิ่มข้อสอบใหม่
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div 
              className="rounded-xl p-4 shadow-sm border"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="text-2xl font-bold text-blue-600">{stats.totalQuestions}</div>
              <div className="text-sm" style={{ color: theme.textColor + '80' }}>ข้อสอบทั้งหมด</div>
            </div>
            <div 
              className="rounded-xl p-4 shadow-sm border"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="text-2xl font-bold text-green-600">{stats.uniqueSubjects}</div>
              <div className="text-sm" style={{ color: theme.textColor + '80' }}>วิชาทั้งหมด</div>
            </div>
            <div 
              className="rounded-xl p-4 shadow-sm border"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="text-2xl font-bold text-purple-600">{stats.uniqueTopics}</div>
              <div className="text-sm" style={{ color: theme.textColor + '80' }}>หัวข้อทั้งหมด</div>
            </div>
            <div 
              className="rounded-xl p-4 shadow-sm border"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="text-2xl font-bold text-indigo-600">{stats.uniqueGrades}</div>
              <div className="text-sm" style={{ color: theme.textColor + '80' }}>ระดับชั้น</div>
            </div>
            <div 
              className="rounded-xl p-4 shadow-sm border"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="text-2xl font-bold text-orange-600">{stats.filteredCount}</div>
              <div className="text-sm" style={{ color: theme.textColor + '80' }}>ข้อสอบที่แสดง</div>
            </div>
          </div>

          {/* Detailed Statistics */}
          {stats.totalQuestions > 0 && (
            <div 
              className="rounded-xl p-6 shadow-sm border mb-6 space-y-4"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>📊 สถิติรายละเอียด</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Difficulty Distribution */}
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: theme.textColor + '90' }}>⭐ ระดับความยาก</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: theme.textColor + '80' }}>🟢 ง่าย</span>
                      <span className="font-bold text-green-600">{stats.difficultyStats.easy || 0} ข้อ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: theme.textColor + '80' }}>🟡 ปานกลาง</span>
                      <span className="font-bold text-yellow-600">{stats.difficultyStats.medium || 0} ข้อ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: theme.textColor + '80' }}>🔴 ยาก</span>
                      <span className="font-bold text-red-600">{stats.difficultyStats.hard || 0} ข้อ</span>
                    </div>
                  </div>
                </div>

                {/* Top Subjects */}
                <div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold mb-3" style={{ color: theme.textColor + '90' }}>📚 วิชาที่มีข้อสอบมากสุด</h4>
                    {userRole === "admin" && stats.noSubjectCount > 0 && (
                      <button
                        onClick={handleDeleteNoSubjectQuestions}
                        className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors mb-3"
                        title="ลบข้อสอบที่ไม่มีวิชาทั้งหมด"
                      >
                        🗑️ ลบข้อสอบไม่มีวิชา ({stats.noSubjectCount} ข้อ)
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.subjectStats)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([subject, count]) => (
                        <div key={subject} className="flex justify-between items-center">
                          <span className="text-sm truncate" style={{ color: theme.textColor + '80' }} title={subject}>
                            {subject === "ไม่มีวิชา" ? (
                              <span className="text-red-500">⚠️ ไม่มีวิชา</span>
                            ) : (
                              subject.length > 15 ? subject.substring(0, 15) + '...' : subject
                            )}
                          </span>
                          <span className="font-bold text-blue-600">{count} ข้อ</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Grade Distribution */}
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: theme.textColor + '90' }}>🎓 การกระจายตามระดับชั้น</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.gradeStats)
                      .sort(([a], [b]) => {
                        // Try to sort numerically first, fall back to string sort
                        const numA = parseInt(a);
                        const numB = parseInt(b);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          return numA - numB;
                        }
                        return a.localeCompare(b);
                      })
                      .slice(0, 5)
                      .map(([grade, count]) => (
                        <div key={grade} className="flex justify-between items-center">
                          <span className="text-sm" style={{ color: theme.textColor + '80' }}>{grade}</span>
                          <span className="font-bold text-purple-600">{count} ข้อ</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div 
            className="rounded-xl p-6 shadow-sm border space-y-4"
            style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 ค้นหาข้อสอบ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ 
                    ...getBackgroundStyle(theme.bgColor),
                    color: theme.textColor,
                    borderColor: theme.textColor + '30'
                  }}
                />
              </div>
              <div className="relative">
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ 
                    ...getBackgroundStyle(theme.bgColor),
                    color: theme.textColor,
                    borderColor: theme.textColor + '30'
                  }}
                >
                  <option value="">ทุกวิชา</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject} ({stats.subjectStats[subject] || 0} ข้อ)
                    </option>
                  ))}
                </select>
                
                {/* Admin Delete Subject Button */}
                {userRole === "admin" && filterSubject && (
                  <button
                    onClick={() => handleDeleteSubject(filterSubject)}
                    className="absolute right-0 top-0 mt-2 mr-10 text-red-500 hover:text-red-700"
                    title="ลบข้อสอบทั้งหมดในวิชานี้"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ 
                  ...getBackgroundStyle(theme.bgColor),
                  color: theme.textColor,
                  borderColor: theme.textColor + '30'
                }}
              >
                <option value="">ทุกหัวข้อ</option>
                {topics.map(topic => {
                  const topicCount = questions.filter(q => q.topic === topic).length;
                  return (
                    <option key={topic} value={topic}>
                      {topic} ({topicCount} ข้อ)
                    </option>
                  );
                })}
              </select>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ 
                  ...getBackgroundStyle(theme.bgColor),
                  color: theme.textColor,
                  borderColor: theme.textColor + '30'
                }}
              >
                <option value="">ทุกระดับ</option>
                {stats.availableGrades.map(grade => (
                  <option key={grade} value={grade}>{grade} ({stats.gradeStats[grade]} ข้อ)</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Edit Form Modal */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div
              className="mt-10 rounded-2xl p-6 w-full max-w-3xl"
              style={{ ...getBackgroundStyle(theme.bgColor) }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>
                📝 แก้ไขข้อสอบ
              </h2>
              
              <div className="space-y-4">
                {/* Common fields: Subject, Topic, Grade, Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>📚 วิชา</label>
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
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>📖 หัวข้อ</label>
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
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>🎓 ระดับชั้น</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{ 
                        ...getBackgroundStyle(theme.bgColor),
                        color: theme.textColor,
                        borderColor: theme.textColor + '30'
                      }}
                    >
                      {stats.availableGrades.length > 0 ? (
                        stats.availableGrades.map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))
                      ) : (
                        // Fallback to standard grades if no data exists yet
                        ["1","2","3","4","5","6","7","8","9","10","11","12"].map(grade => (
                          <option key={grade} value={grade}>ป.{grade}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>⭐ ระดับความยาก</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard'})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                {/* Question */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>❓ คำถาม</label>
                  <textarea
                    value={formData.question}
                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                    rows={3}
                    placeholder="กรอกคำถาม..."
                  />
                </div>

                {/* Choices */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>📝 ตัวเลือก</label>
                  {formData.choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium w-8" style={{ color: theme.textColor }}>
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
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{ 
                          ...getBackgroundStyle(theme.bgColor),
                          color: theme.textColor,
                          borderColor: theme.textColor + '30'
                        }}
                        placeholder={`ตัวเลือก ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                  
                  {/* Correct Answer Selection */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>
                      ✅ เลือกคำตอบที่ถูก
                    </label>
                    <select
                      value={formData.correctIndex}
                      onChange={(e) => setFormData({...formData, correctIndex: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.textColor + '80' }}>💡 คำอธิบาย (ไม่บังคับ)</label>
                  <textarea
                    value={formData.explanation || ""}
                    onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ 
                      ...getBackgroundStyle(theme.bgColor),
                      color: theme.textColor,
                      borderColor: theme.textColor + '30'
                    }}
                    rows={3}
                    placeholder="อธิบายเหตุผลของคำตอบที่ถูก..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
                </button>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    resetForm();
                  }}
                  disabled={saving}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="grid gap-4">
          {filteredQuestions.length === 0 ? (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
            >
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: theme.textColor + '80' }}>ไม่พบข้อสอบ</h3>
              <p style={{ color: theme.textColor + '60' }}>ลองปรับเงื่อนไขการค้นหาหรือเพิ่มข้อสอบใหม่</p>
            </div>
          ) : (
            filteredQuestions.map((question, index) => (
              <div 
                key={question.id} 
                className="rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
                style={{ ...getBackgroundStyle(theme.bgColor), borderColor: theme.textColor + '20' }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {question.subject}
                      </span>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {question.topic}
                      </span>
                      <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        {question.grade}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty === 'easy' ? '🟢 ง่าย' :
                         question.difficulty === 'medium' ? '🟡 ปานกลาง' : '🔴 ยาก'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: theme.textColor }}>
                      {index + 1}. {question.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {question.choices.map((choice, choiceIndex) => (
                        <div key={choiceIndex} className={`p-2 rounded-lg text-sm ${
                          choiceIndex === question.correctIndex 
                            ? 'bg-green-100 text-green-800 font-medium' 
                            : ''
                        }`}
                        style={choiceIndex !== question.correctIndex ? { 
                          backgroundColor: theme.textColor + '10', 
                          color: theme.textColor + '80' 
                        } : {}}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + choiceIndex)}.
                          </span>
                          {choice}
                          {choiceIndex === question.correctIndex && (
                            <span className="ml-2">✅</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <div className="border-l-4 border-blue-400 p-3 rounded" style={{ backgroundColor: theme.textColor + '05' }}>
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">💡 คำอธิบาย:</span> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(question)}
                      className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                      title="แก้ไข"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => question.id && handleDelete(question.id)}
                      className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                      title="ลบ"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="transition-colors hover:opacity-80"
            style={{ color: theme.textColor + '60' }}
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </div>
    </ThemedLayout>
  );
}
