# 🚀 imgbg.net — Fast, Ephemeral & Lightweight Media Sharing Platform

[![Live Demo](https://img.shields.io/badge/Live_Site-imgbg.net-0070f3?style=for-the-badge&logo=cloudflare&logoColor=white)](https://imgbg.net)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**[imgbg.net](https://imgbg.net)** is a minimalist, fast, and ephemeral media sharing platform designed for seamless upload and sharing of **images, videos, and audio files**. 

Built with zero-cost infrastructure in mind, it provides a frictionless "load and share" experience with automated content self-deletion, media-attached notes, and visitor comments.

🌐 **Try it live:** [https://imgbg.net](https://imgbg.net)

---

## ✨ Features

* ⚡ **Instant Uploads:** Drag-and-drop or paste media (images, videos, audio) with zero friction.
* ⏳ **Ephemeral Storage:** Automatic self-deletion based on customizable expiration lifecycles.
* 📝 **Media-Attached Notes:** Add optional descriptions or messages directly to shared media.
* 💬 **Interactive Comments:** Visitor comment section under shared view pages (`/v/xyz`).
* 🔒 **Passwordless Auth:** Powered by Supabase Auth (Google OAuth / Magic Link) strictly for upload history management.
* 🚫 **Ad-Supported View Pages:** Keep the upload interface 100% clean and ad-free while monetizing view landing pages.

---

## 🛠️ Architecture & Tech Stack

The platform is designed for maximum speed, unlimited bandwidth, and near-zero running costs:

* **Frontend & Edge Backend:** [Cloudflare Pages](https://pages.cloudflare.com/) & [Cloudflare Workers](https://workers.cloudflare.com/)
* **Media Storage:** [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (Direct client upload via Pre-signed URLs & Lifecycle auto-deletion rules)
* **Authentication & User History:** [Supabase Auth](https://supabase.com/)
* **Domain & DNS:** Registered at **[imgbg.net](https://imgbg.net)** via Cloudflare infrastructure.

---

## 🔗 Official Links & Resources

* **Main Application:** [https://imgbg.net](https://imgbg.net)
* **Upload Media:** [https://imgbg.net](https://imgbg.net)
* **Report Issues / Feedback:** Feel free to open an issue or pull request in this repository!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Developed with ❤️ for fast, anonymous, and ephemeral content delivery at <b><a href="https://imgbg.net">imgbg.net</a></b>.
</p>
