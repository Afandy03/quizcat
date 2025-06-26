import React from "react";

interface ConfidenceSelectorProps {
    value: "guess" | "not_confident" | "confident";
    onChange: (value: "guess" | "not_confident" | "confident") => void;
}

const buttons: { label: string; value: "guess" | "not_confident" | "confident"; color: string }[] = [
    { label: "😕 เดา", value: "guess", color: "bg-yellow-400" },
    { label: "😬 ไม่มั่นใจ", value: "not_confident", color: "bg-orange-300" },
    { label: "😎 มั่นใจ", value: "confident", color: "bg-green-400" },
];

export default function ConfidenceSelector({ value, onChange }: ConfidenceSelectorProps) {
    return (
        <div className="flex justify-center gap-3 mt-4 text-sm">
            {buttons.map((btn) => (
                <button
                    key={btn.value}
                    onClick={() => onChange(btn.value)}
                    className={`px-4 py-1.5 rounded-full text-white font-medium transition-all duration-150
            ${value === btn.value ? btn.color : "bg-gray-300 text-gray-700 hover:bg-gray-400"}`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );
}
