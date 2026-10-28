"use client";

import { profile } from "@/lib/content";
import { Input as KitInput } from "@repo/ui/kit/Input";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Arrow, Sun } from "./icons";

const ContactContext = createContext<(subject?: string) => void>(() => {});
const nav = [
  ["Work", "/work"],
  ["Services", "/services"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
] as const;
const subscribeTheme = (callback: () => void) => {
  window.addEventListener("portfolio-theme", callback);
  return () => window.removeEventListener("portfolio-theme", callback);
};
const readTheme = () => document.documentElement.dataset.theme === "dark";

export function ContactButton({
  children,
  className = "button button-blue",
  subject,
}: {
  children: ReactNode;
  className?: string;
  subject?: string;
}) {
  const openContact = useContext(ContactContext);
  return (
    <button className={className} onClick={() => openContact(subject)}>
      {children}
    </button>
  );
}

function Header() {
  const path = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mahdi-portfolio-theme", next);
    } catch {
      /* Private browsing remains usable. */
    }
    window.dispatchEvent(new Event("portfolio-theme"));
  }
  function closeMenu() {
    menu.current?.close();
    setMenuOpen(false);
  }
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label={`${profile.name}, home`}>
            {profile.brand}
            <span>.</span>
          </Link>
          <button
            className="mode-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          >
            <Sun moon={dark} />
            <span>CHANGE THE MODE</span>
          </button>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="menu-toggle"
            aria-haspopup="dialog"
            aria-controls="navigation-menu"
            aria-expanded={menuOpen}
            onClick={() => {
              menu.current?.showModal();
              setMenuOpen(true);
            }}
          >
            <span>MENU</span>
            <span className="menu-symbol">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>
      <dialog
        ref={menu}
        id="navigation-menu"
        className="navigation-dialog"
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        aria-label="Navigation menu"
      >
        <div className="navigation-sheet">
          <div className="menu-top">
            <Link className="brand" href="/" onClick={closeMenu}>
              {profile.brand}
              <span>.</span>
            </Link>
            <button
              className="close-button"
              onClick={closeMenu}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
          <p className="eyebrow">A LITTLE LOOK AROUND</p>
          <nav aria-label="Expanded navigation">
            {[["Home", "/"], ...nav].map(([label, href], index) => (
              <Link key={href} href={href!} onClick={closeMenu}>
                <small>0{index + 1}</small>
                {label}
                <Arrow diagonal />
              </Link>
            ))}
          </nav>
          <div className="menu-bottom">
            <p>{profile.location}</p>
            <ContactButton className="text-link">
              Let’s talk <Arrow diagonal />
            </ContactButton>
          </div>
        </div>
      </dialog>
    </>
  );
}

function ContactDialog({
  dialog,
  subject,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  subject: string;
}) {
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [brief, setBrief] = useState("");
  const form = useRef<HTMLFormElement>(null);
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = `PROJECT ENQUIRY — ${profile.name}\n\nName: ${data.get("name")}\nEmail: ${data.get("email")}\nService: ${data.get("service")}\nBudget: ${data.get("budget")}\n\n${data.get("message")}\n`;
    setBrief(text);
    setReady(true);
    try {
      localStorage.setItem("mahdi-portfolio-project-brief", text);
    } catch {
      /* Download remains available. */
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([brief], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-brief.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
    } catch {
      download();
    }
  }
  return (
    <dialog
      ref={dialog}
      className="contact-dialog"
      aria-labelledby="contact-title"
      onClose={() => {
        setReady(false);
        setCopied(false);
        form.current?.reset();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      <button
        className="close-button"
        onClick={() => dialog.current?.close()}
        aria-label="Close contact form"
      >
        ×
      </button>
      <p className="eyebrow">SOMETHING IN MIND?</p>
      <h2 id="contact-title">
        LET’S <em>talk.</em>
      </h2>
      {ready ? (
        <div className="brief-ready">
          <span className="brief-check">✓</span>
          <h3>Your brief is ready.</h3>
          <p>
            {profile.email
              ? "Open your email app to send it, or keep a copy for later."
              : "Download a copy of your project brief. Nothing has been sent."}
          </p>
          <div className="brief-actions">
            {profile.email && (
              <a
                className="button button-blue"
                href={`mailto:${profile.email}?subject=${encodeURIComponent(subject || "A project in mind")}&body=${encodeURIComponent(brief)}`}
              >
                SEND BY EMAIL <Arrow />
              </a>
            )}
            <button className="button button-blue" onClick={download}>
              DOWNLOAD BRIEF <Arrow />
            </button>
            <button className="button button-outline" onClick={copy}>
              {copied ? "COPIED ✓" : "COPY BRIEF"}
            </button>
          </div>
          <button className="text-link" onClick={() => setReady(false)}>
            Back to my brief
          </button>
        </div>
      ) : (
        <>
          <p className="contact-description">
            A little context goes a long way. Tell me what you have in mind.
          </p>
          <form ref={form} onSubmit={prepare} key={subject}>
            <div className="form-row">
              <label>
                Your name
                <KitInput
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="Alex Morgan"
                  maxLength={100}
                />
              </label>
              <label>
                Email address
                <KitInput
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="alex@company.com"
                  maxLength={200}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                What are we making?
                <select name="service" defaultValue={subject || "Website"}>
                  <option>Website</option>
                  <option>Landing page</option>
                  <option>Product design</option>
                  <option>Mobile app</option>
                  <option>Brand identity</option>
                  <option>Sprint plan</option>
                  <option>Studio plan</option>
                  <option>Retainer plan</option>
                  <option>Something else</option>
                </select>
              </label>
              <label>
                Budget range
                <select name="budget" defaultValue="Let’s discuss">
                  <option>Let’s discuss</option>
                  <option>Under $2,000</option>
                  <option>$2,000–$5,000</option>
                  <option>$5,000–$10,000</option>
                  <option>$10,000+</option>
                </select>
              </label>
            </div>
            <label>
              A few words about your project
              <textarea
                name="message"
                required
                rows={4}
                placeholder="The idea, the people it’s for, and when you’d like to launch…"
                maxLength={5000}
              />
            </label>
            <div className="form-bottom">
              <p>Your next good idea starts here.</p>
              <button type="submit" className="button button-blue">
                PREPARE MY BRIEF <Arrow />
              </button>
            </div>
          </form>
        </>
      )}
    </dialog>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" className="brand">
            {profile.brand}
            <span>.</span>
          </Link>
          <p>Let’s build yours.</p>
          <ContactButton className="button button-dark">
            START A CONVERSATION <Arrow />
          </ContactButton>
        </div>
        <div>
          <h3>PAGES</h3>
          {nav.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h3>PLANS</h3>
          <Link href="/pricing#sprint">Sprint · $1,800</Link>
          <Link href="/pricing#studio">Studio · $4,900</Link>
          <Link href="/pricing#retainer">Retainer · $3,200/mo</Link>
          <Link href="/pricing#compare">
            Compare all <Arrow />
          </Link>
        </div>
        <div>
          <h3>LET’S CONNECT</h3>
          <p>{profile.location}</p>
          {profile.email ? (
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          ) : (
            <ContactButton className="footer-contact">
              Have a project in mind? <Arrow diagonal />
            </ContactButton>
          )}
          <Link href="/about#process">A little about my process</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {profile.name}. Made with consideration.
        </span>
        <a href="#top">BACK TO TOP ↑</a>
      </div>
    </footer>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const contact = useRef<HTMLDialogElement>(null);
  const [subject, setSubject] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    const watch = () =>
      document
        .querySelectorAll("[data-reveal]:not(.is-visible)")
        .forEach((el) => observer.observe(el));
    const mutations = new MutationObserver(watch);
    mutations.observe(document.body, { childList: true, subtree: true });
    watch();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
  function openContact(value = "") {
    setSubject(value);
    contact.current?.showModal();
  }
  return (
    <ContactContext.Provider value={openContact}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <ContactDialog dialog={contact} subject={subject} />
    </ContactContext.Provider>
  );
}
