// scripts/theme-preloader.js
// Script นี้จะช่วยป้องกันการกระพริบโดยการ preload theme ก่อนที่ React จะ render

(function() {
  'use strict';
  
  // ฟังก์ชันโหลด theme จาก localStorage
  function preloadTheme() {
    try {
      const isGuestMode = localStorage.getItem('quizcat-guest-mode') === 'true';
      let theme = { bgColor: '#ffffff', textColor: '#000000' };
      
      if (isGuestMode) {
        const savedTheme = localStorage.getItem('quizcat-guest-theme');
        if (savedTheme) {
          theme = JSON.parse(savedTheme);
        }
      } else {
        const cachedTheme = localStorage.getItem('quizcat-user-theme-cache');
        if (cachedTheme) {
          theme = JSON.parse(cachedTheme);
        }
      }
      
      // ตั้งค่า CSS variables ทันที
      document.documentElement.style.setProperty('--background', theme.bgColor);
      document.documentElement.style.setProperty('--foreground', theme.textColor);
      
      // ตั้งค่า body style ทันที
      if (theme.bgColor.includes('gradient')) {
        document.body.style.background = theme.bgColor;
      } else {
        document.body.style.backgroundColor = theme.bgColor;
      }
      document.body.style.color = theme.textColor;
      
      // เพิ่ม class เพื่อบอกว่า theme โหลดแล้ว
      document.documentElement.classList.add('theme-loaded');
      
    } catch (error) {
      console.warn('Theme preloader error:', error);
      // ใช้ theme เริ่มต้นหากเกิดข้อผิดพลาด
      document.documentElement.style.setProperty('--background', '#ffffff');
      document.documentElement.style.setProperty('--foreground', '#000000');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    }
  }
  
  // รันทันทีเมื่อ DOM พร้อม
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadTheme);
  } else {
    preloadTheme();
  }
})();
