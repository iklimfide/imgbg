import Script from "next/script";

export function ThemeScript() {
  return (
    <Script id="theme-init" strategy="beforeInteractive">
      {`try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`}
    </Script>
  );
}
