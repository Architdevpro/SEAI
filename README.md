# SEAI

# TinyNumberBot 🤖  
*A toy web app that tells you which reference number your input is closest to — with confidence and a "Data Verified" ID.*

![screenshot](docs/screenshot.png)

---

## ✨ Features
- Enter any number (positive or negative).  
- Bot replies in a **chat-style interface**.  
- Calculates which reference number (default: `0, 1, 20`) is closest.  
- Shows:
  - 🎯 Closest reference number
  - 📊 Confidence level (%)
  - 🆔 Random **Data Verified ID** in the format `NNNN-XX-NNNN`  
    - `N` = digit (0–9)  
    - `X` = letter chosen from **L, P, K, M, N, O**  
- "Load Examples" button demonstrates the output with `2` and `-30`.  
- Fully client-side — no backend required.  

---

## 📂 Project Structure

tiny-number-bot/ ├── index.html     # Main HTML page ├── style.css      # Styles (chat UI look & feel) ├── script.js      # Bot logic (distance, confidence, random ID) └── README.md      # Project instructions

---

## 🚀 Getting Started
1. Clone the repo:
   ```bash
   git clone https://github.com/<your-username>/tiny-number-bot.git
   cd tiny-number-bot

2. Open index.html in your browser.
That’s it! 🎉 The bot runs entirely in the browser.




---
