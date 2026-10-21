# Handcrafted Furniture Workshop Gallery

A lightweight, responsive web application built for floor staff to manage custom handcrafted furniture pieces, track pricing, photographs, materials, and workshop records in real-time. Designed to replace manual paper systems and Excel sheets, eliminating data loss and operational slowdowns.

##  Live Demo
https://handcrafted-furniture-workshop-gall-gamma.vercel.app

---

##  Key Features & Technical Highlights

### 1. Agile User Stories (The "Happy Path")
* **Dashboard Summary:** Real-time counters tracking total furniture pieces, items in progress, completed pieces, and unique materials.
* **Instant Search & Filtering:** Filter collection seamlessly by name, ID, category, or material with immediate response times.
* **Sorting Options:** Sort records by recently added, oldest first, or alphabetically (A–Z).
* **Detailed View & Management:** Click any furniture card for a detailed popup modal view, or use inline buttons to edit and delete records instantly.

### 2. The "Unhappy Path" (Edge Case Handling)
* **Empty States:** Gracefully displays user-friendly "No data found" or "No matching furniture" messages when searches or filters yield zero results.
* **Bad Connectivity Simulation:** Built-in connection status indicator (`navigator.onLine`) and asynchronous loading spinners for data persistence delays.
* **Input Validation & Security:** Strict form validation prevents malformed data submissions, highlighting offending fields in red (`aria-invalid`) and sanitizing all text inputs against XSS injection.

### 3. Non-Functional Requirements (NFRs)
* **Accessibility (a11y):** Semantic HTML5 landmarks (`<dialog>`, `<article>`, `<main>`), full keyboard navigability (`Enter`/`Space` support), skip links, and ARIA attributes designed for 100% Lighthouse accessibility.
* **Telemetry Simulation:** Logs structured analytics payloads (`[Analytics] User interacted with Handcrafted Furniture Workshop Gallery`) to the browser console on primary user actions.
* **Image Processing:** Built-in client-side file validation (JPG, PNG, WebP, AVIF up to 8MB) with automatic downscaling and compression before storing in browser state.

---

##  Tech Stack
* **Markup:** Pure Semantic HTML5
* **Styling:** Vanilla CSS (Custom properties, monochromatic corporate design system, CSS Grid/Flexbox, fully responsive)
* **Logic:** Vanilla JavaScript (ES6+, DOM manipulation, LocalStorage persistence API)
* **Hosting:** Vercel (Static deployment)

---

##  Project Structure

```text
handcrafted-furniture-workshop-gallery/
─ index.html    
─ css/
   ─ style.css  
─ js/
   ─ app.js    
