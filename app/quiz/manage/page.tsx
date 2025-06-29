'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import ThemedLayout from "@/components/ThemedLayout";

interface Question {
  id?: string;
  question: string;
  choices: string[];
  correctIndex: number;
  subject: string;
  topic: string;
  grade: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function QuizManagePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isCreating) {
        setIsCreating(false);
        setEditingQuestion(null);
        resetForm();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isCreating]);

  useEffect(() => {
    // ตรวจสอบ guest mode - ไม่อนุญาตให้ guest จัดการข้อสอบ
    const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true'
    if (isGuestMode) {
      router.push("/dashboard");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
      } else {
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
      
      // Extract unique subjects and topics
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
        updatedAt: new Date()
      };

      if (editingQuestion?.id) {
        // Update existing question
        await updateDoc(doc(db, "questions", editingQuestion.id), questionData);
        alert("✅ แก้ไขข้อสอบสำเร็จ!");
      } else {
        // Create new question
        await addDoc(collection(db, "questions"), {
          ...questionData,
          createdAt: new Date()
        });
        alert("✅ เพิ่มข้อสอบสำเร็จ!");
      }

      setEditingQuestion(null);
      setIsCreating(false);
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

  const handleEdit = (question: Question) => {
    setFormData(question);
    setEditingQuestion(question);
    setIsCreating(true);
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
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filterSubject || q.subject === filterSubject;
    const matchesTopic = !filterTopic || q.topic === filterTopic;
    const matchesGrade = !filterGrade || q.grade.toString() === filterGrade;
    
    return matchesSearch && matchesSubject && matchesTopic && matchesGrade;
  });

  if (loading) {
    return (
      <ThemedLayout>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
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
              <h1 className="text-3xl font-bold text-gray-800">🗂️ จัดการข้อสอบ</h1>
              <p className="text-gray-600">จัดการข้อสอบทั้งหมดในระบบ</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
                setEditingQuestion(null);
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200"
            >
              ➕ เพิ่มข้อสอบใหม่
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
              <div className="text-sm text-gray-600">ข้อสอบทั้งหมด</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-green-600">{subjects.length}</div>
              <div className="text-sm text-gray-600">วิชาทั้งหมด</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">{topics.length}</div>
              <div className="text-sm text-gray-600">หัวข้อทั้งหมด</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="text-2xl font-bold text-orange-600">{filteredQuestions.length}</div>
              <div className="text-sm text-gray-600">ข้อสอบที่แสดง</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <input
                  type="text"
                  placeholder="🔍 ค้นหาข้อสอบ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">ทุกวิชา</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">ทุกหัวข้อ</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">ทุกระดับ</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                  <option key={grade} value={grade}>ป.{grade}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {editingQuestion ? "📝 แก้ไขข้อสอบ" : "➕ เพิ่มข้อสอบใหม่"}
              </h2>
              
              <div className="space-y-4">
                {/* Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">❓ คำถาม</label>
                  <textarea
                    value={formData.question}
                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="กรอกคำถาม..."
                  />
                </div>

                {/* Choices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">📝 ตัวเลือก</label>
                  {formData.choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-3 mb-2">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={formData.correctIndex === index}
                          onChange={() => setFormData({...formData, correctIndex: index})}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium">{String.fromCharCode(65 + index)}.</span>
                      </div>
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => {
                          const newChoices = [...formData.choices];
                          newChoices[index] = e.target.value;
                          setFormData({...formData, choices: newChoices});
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`ตัวเลือก ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Subject, Topic, Grade */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📚 วิชา</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="เช่น คณิตศาสตร์"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📖 หัวข้อ</label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData({...formData, topic: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="เช่น พีชคณิต"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🎓 ระดับชั้น</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                        <option key={grade} value={grade}>ป.{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">⭐ ระดับความยาก</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="easy">🟢 ง่าย</option>
                    <option value="medium">🟡 ปานกลาง</option>
                    <option value="hard">🔴 ยาก</option>
                  </select>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">💡 คำอธิบาย (ไม่บังคับ)</label>
                  <textarea
                    value={formData.explanation || ""}
                    onChange={(e) => setFormData({...formData, explanation: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    setIsCreating(false);
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
            <div className="text-center py-12 bg-white rounded-xl border">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">ไม่พบข้อสอบ</h3>
              <p className="text-gray-500">ลองปรับเงื่อนไขการค้นหาหรือเพิ่มข้อสอบใหม่</p>
            </div>
          ) : (
            filteredQuestions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow">
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
                        ป.{question.grade}
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      {index + 1}. {question.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {question.choices.map((choice, choiceIndex) => (
                        <div key={choiceIndex} className={`p-2 rounded-lg text-sm ${
                          choiceIndex === question.correctIndex 
                            ? 'bg-green-100 text-green-800 font-medium' 
                            : 'bg-gray-50 text-gray-700'
                        }`}>
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
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
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
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </div>
    </ThemedLayout>
  );
}
