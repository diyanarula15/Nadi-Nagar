import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Eye,
  LogIn,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Users,
  Waves,
  X,
  Zap,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ViewKey } from "../types";
import { LandingDataEngine } from "./LandingDataEngine";
import { NadiLogo } from "./NadiLogo";

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onNavigate: (view: ViewKey) => void;
}

const TYPEWRITER_LINE =
  "Live streams from the fleet meet forecasting models and public timelines — so the city sees around corners, not after the fact.";

const PARTICLE_COUNT = 48;

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [showCitizenLogin, setShowCitizenLogin] = useState(false);
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [citizenEmail, setCitizenEmail] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [introDone, setIntroDone] = useState(false);
  const [typedLine, setTypedLine] = useState("");

  const curtainRef = useRef<HTMLDivElement>(null);
  const busSceneRef = useRef<HTMLDivElement>(null);
  const busGroupRef = useRef<HTMLDivElement>(null);
  const particleWrapRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        dy: (Math.random() - 0.5) * 42,
        dx: -28 - Math.random() * 90,
        s: 3 + Math.random() * 7,
        delay: Math.random() * 0.35,
      })),
    []
  );

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(curtainRef.current, { clipPath: "inset(0% 0% 0% 100%)", opacity: 0 });
      gsap.set(busSceneRef.current, { opacity: 0, visibility: "hidden" });
      setIntroDone(true);
      return;
    }

    const curtain = curtainRef.current;
    const busScene = busSceneRef.current;
    const busGroup = busGroupRef.current;
    const particleWrap = particleWrapRef.current;
    if (!curtain || !busScene || !busGroup || !particleWrap) return;

    const particleEls = particleWrap.querySelectorAll(".landing-particle");

    gsap.set(curtain, { clipPath: "inset(0% 0% 0% 0%)" });
    gsap.set(busGroup, { x: "-22vw" });
    gsap.set(particleEls, { opacity: 0, scale: 0.35, x: 0, y: 0 });
    gsap.set(busScene, { opacity: 1, visibility: "visible" });

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        gsap.to(busScene, {
          opacity: 0,
          duration: 0.55,
          delay: 0.2,
          onComplete: () => {
            gsap.set(busScene, { visibility: "hidden" });
          },
        });
        gsap.set(curtain, { display: "none" });
        setIntroDone(true);
      },
    });

    tl.to(
      curtain,
      {
        clipPath: "inset(0% 0% 0% 100%)",
        duration: 2.75,
      },
      0
    ).to(
      busGroup,
      {
        x: "118vw",
        duration: 2.75,
      },
      0
    );

    tl.to(
      particleEls,
      {
        opacity: 0.55,
        scale: 1,
        duration: 0.5,
        stagger: { amount: 0.55, from: "random" },
      },
      0.05
    ).to(
      particleEls,
      {
        opacity: 0,
        y: -6,
        x: -10,
        duration: 0.9,
        stagger: { amount: 0.7, from: "end" },
      },
      1.3
    );

    let raf = requestAnimationFrame(() => {
      document.querySelectorAll(".landing-scroll-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 48 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top bottom-=8%",
              once: true,
            },
          }
        );
      });
      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(raf);
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  useLayoutEffect(() => {
    if (!introDone) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTypedLine(TYPEWRITER_LINE.slice(0, i));
      if (i >= TYPEWRITER_LINE.length) window.clearInterval(id);
    }, 38);
    return () => window.clearInterval(id);
  }, [introDone]);

  const handleCitizenLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (citizenEmail) {
      localStorage.setItem("userType", "citizen");
      onNavigate("citizen");
    }
  };

  const handleOperatorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (operatorId) {
      localStorage.setItem("userType", "operator");
      onNavigate("dashboard");
    }
  };

  return (
    <div className="landing-shell">
      <LandingDataEngine />

      <div className="landing-content-below-fx">
        <nav className="landing-nav">
          <div className="landing-brand" aria-label="Nadi Nagar">
            <NadiLogo className="landing-brand-logo" />
            <span>
              <strong>Nadi Nagar</strong>
              <small>Urban intelligence from the moving grid</small>
            </span>
          </div>
          <div className="landing-nav-actions">
            <button type="button" className="landing-btn landing-btn--citizen ghost" onClick={() => setShowCitizenLogin(true)}>
              Citizen login
            </button>
            <button type="button" className="landing-btn landing-btn--operator primary" onClick={() => setShowOperatorLogin(true)}>
              Operator portal
            </button>
          </div>
        </nav>

        <main ref={mainRef} className="landing-main">
        <section className="landing-hero editorial landing-hero--center">
          <header className="landing-hero-header">
            <p className="landing-kicker">Operating system for the moving city</p>
            <h1 className="landing-title">
              Smart transit. <span>Data-driven</span> urban intelligence.
            </h1>
            <p className={`landing-lede landing-typewriter ${introDone ? "is-on" : ""}`}>
              {introDone ? typedLine : "\u00a0"}
            </p>
            <div className="landing-cta-row">
              <button type="button" className="landing-btn landing-btn--citizen primary large" onClick={() => setShowCitizenLogin(true)}>
                <Users size={18} />
                Citizen portal
                <ChevronRight size={17} />
              </button>
              <button
                type="button"
                className="landing-btn landing-btn--operator secondary large"
                onClick={() => setShowOperatorLogin(true)}
              >
                <LogIn size={18} />
                Operator console
              </button>
            </div>
          </header>

          <dl className="landing-stats-strip landing-scroll-reveal">
            <div>
              <dt>Sensor fleet</dt>
              <dd>14 vehicles</dd>
            </div>
            <div>
              <dt>SLA posture</dt>
              <dd>94.7% on track</dd>
            </div>
            <div>
              <dt>Estimated impact</dt>
              <dd>Rs 23.1 Cr saved vs. emergency fixes</dd>
            </div>
          </dl>

          <div className="landing-columns">
            <div className="landing-column landing-scroll-reveal">
              <h2 className="landing-column-title">How it runs</h2>
              <ol className="landing-steps">
                <li>
                  <span className="landing-step-num" aria-hidden="true">
                    1
                  </span>
                  <div>
                    <strong>Sense</strong>
                    <p>
                      Road stress, pipes, rainfall, and traffic stream in from bus-mounted units and fixed inputs — continuously, ward by
                      ward.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="landing-step-num" aria-hidden="true">
                    2
                  </span>
                  <div>
                    <strong>Predict</strong>
                    <p>Models surface what will matter next: flood pockets, congestion, and crews under pressure.</p>
                  </div>
                </li>
                <li>
                  <span className="landing-step-num" aria-hidden="true">
                    3
                  </span>
                  <div>
                    <strong>Act</strong>
                    <p>Dispatch routes to the right team; residents follow status and SLA time in plain language.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="landing-column landing-scroll-reveal">
              <h2 className="landing-column-title">Example signals</h2>
              <ul className="landing-feed-list">
                <li>
                  <Waves size={16} strokeWidth={1.75} />
                  <span>Koramangala corridor — runoff surge possible within ~18 min</span>
                </li>
                <li>
                  <Zap size={16} strokeWidth={1.75} />
                  <span>Crew matched to corridor K-12 by skill and ETA</span>
                </li>
                <li>
                  <MapPin size={16} strokeWidth={1.75} />
                  <span>Resident view updated — repair timeline and SLA clock visible</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="landing-capabilities landing-scroll-reveal">
          <h2 className="landing-cap-head">What Nadi Nagar does</h2>
          <div className="landing-cap-rows">
            <CapabilityRow icon={Eye} title="Detection" text="Telemetry and vision-derived reads before faults become emergencies." />
            <CapabilityRow icon={AlertCircle} title="Prioritisation" text="Queues that reflect civic risk, weather, and resources." />
            <CapabilityRow icon={ShieldCheck} title="Dispatch" text="Assignments your teams can defend; progress visible everywhere." />
            <CapabilityRow icon={TrendingUp} title="Outcomes" text="Costs, SLAs, and ward-level posture for leadership." />
          </div>
        </section>
        </main>
      </div>

      <div ref={curtainRef} className="landing-curtain" aria-hidden="true" />

      <div ref={busSceneRef} className="landing-bus-scene" aria-hidden="true">
        <div ref={busGroupRef} className="landing-bus-group">
          {/* Trail dust: separate layer so a flat Figma bus SVG does not need particles baked in */}
          <div ref={particleWrapRef} className="landing-particle-wrap">
            {particles.map((p) => (
              <span
                key={p.id}
                className="landing-particle"
                style={{
                  width: p.s,
                  height: p.s,
                  left: p.dx,
                  top: `calc(50% + ${p.dy}px)`,
                }}
              />
            ))}
          </div>
          <img
            className="landing-bus-svg"
            src="/illustrations/hero-bus.svg"
            alt=""
            width={200}
            height={72}
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      {showCitizenLogin && (
        <div className="landing-modal-backdrop" role="dialog" aria-modal="true" aria-label="Citizen login">
          <div className="landing-modal">
            <div className="landing-modal-head">
              <h2>Citizen login</h2>
              <button type="button" className="landing-close" onClick={() => setShowCitizenLogin(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="landing-modal-copy">Track civic issues, upload evidence, and follow resolution progress.</p>
            <form onSubmit={handleCitizenLogin} className="landing-form">
              <label htmlFor="citizen-email">Email address</label>
              <input
                id="citizen-email"
                type="email"
                placeholder="your@email.com"
                value={citizenEmail}
                onChange={(e) => setCitizenEmail(e.target.value)}
              />
              <button type="submit" className="landing-btn landing-btn--citizen primary" disabled={!citizenEmail}>
                Enter citizen portal
              </button>
              <small>Demo: any valid email works.</small>
            </form>
          </div>
        </div>
      )}

      {showOperatorLogin && (
        <div className="landing-modal-backdrop" role="dialog" aria-modal="true" aria-label="Operator login">
          <div className="landing-modal">
            <div className="landing-modal-head">
              <h2>Operator login</h2>
              <button type="button" className="landing-close" onClick={() => setShowOperatorLogin(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="landing-modal-copy">Command interface for preemptions, dispatch, and performance monitoring.</p>
            <form onSubmit={handleOperatorLogin} className="landing-form">
              <label htmlFor="operator-id">Operator ID</label>
              <input
                id="operator-id"
                type="text"
                placeholder="NADI-OP-001"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
              />
              <button type="submit" className="landing-btn landing-btn--operator primary" disabled={!operatorId}>
                Access dashboard
              </button>
              <small>Demo: any ID works.</small>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CapabilityRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Eye;
  title: string;
  text: string;
}) {
  return (
    <div className="landing-cap-row">
      <Icon size={20} strokeWidth={1.5} className="landing-cap-icon" aria-hidden />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
