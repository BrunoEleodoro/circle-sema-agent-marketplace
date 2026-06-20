import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const VIDEO_FPS = 30;
const SCENE_DURATION_IN_FRAMES = 300;
export const VIDEO_DURATION_IN_FRAMES = SCENE_DURATION_IN_FRAMES * 6;

const COLORS = {
  ink: "#101322",
  inkSoft: "#31384f",
  muted: "#667085",
  page: "#f5f7fa",
  surface: "#ffffff",
  surfaceStrong: "#edf3f7",
  line: "#d8e1ea",
  blue: "#2364d2",
  teal: "#168c84",
  green: "#15945f",
  gold: "#c88908",
  coral: "#d9573d",
  violet: "#7357c5",
};

type SceneKind = "pitch" | "seller" | "trust" | "buyer" | "payment" | "flywheel";

type SceneConfig = {
  eyebrow: string;
  title: string;
  lede: string;
  points: string[];
  kind: SceneKind;
};

const SCENES: SceneConfig[] = [
  {
    eyebrow: "The pitch",
    title: "Circle + Sema Agent Marketplace",
    lede:
      "Agents can safely list useful work, buyers can pay in USDC, and the marketplace releases the deliverable only after x402 checkout succeeds.",
    points: ["Wallet identity", "x402 payment gate", "Verified data handoff"],
    kind: "pitch",
  },
  {
    eyebrow: "1. Supply",
    title: "Seller agents turn owned knowledge into listings.",
    lede:
      "The seller scans safe local material, drafts a priced offer, waits for approval, and publishes with wallet-backed identity.",
    points: ["Local scan", "Policy filter", "POST /api/listings"],
    kind: "seller",
  },
  {
    eyebrow: "2. Trust layer",
    title: "Sema gives every listing shared marketplace meaning.",
    lede:
      "Listings carry type, risk, proof summary, Sema context, reputation, and delivery mode, so agents compare more than title and price.",
    points: ["Sema handles", "Risk and proof", "Search index"],
    kind: "trust",
  },
  {
    eyebrow: "3. Demand",
    title: "Buyer agents search, compare, and ask before spending.",
    lede:
      "A buyer authenticates with a Circle Agent Wallet, searches the catalog, compares price and proof, then asks the human before paying USDC.",
    points: ["Wallet auth", "Listing search", "Human approval"],
    kind: "buyer",
  },
  {
    eyebrow: "4. Payment",
    title: "USDC unlocks the data, not just a promise.",
    lede:
      "Unpaid delivery returns 402. After Circle x402 payment, the endpoint records the purchase, receipt, recipient, and delivery status.",
    points: ["GET /api/deliver/:id", "Circle Gateway x402", "Receipt recorded"],
    kind: "payment",
  },
  {
    eyebrow: "5. Network effect",
    title: "Delivery creates trust, trust creates the next transaction.",
    lede:
      "The buyer receives the payload or polls fulfillment, reviews the seller, and the payout ledger keeps the marketplace accountable.",
    points: ["Deliverable handoff", "Verified review", "Seller payout"],
    kind: "flywheel",
  },
];

const shadow = "0 24px 80px rgba(16, 19, 34, 0.13)";

export const MarketplaceVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const activeScene = Math.min(Math.floor(frame / SCENE_DURATION_IN_FRAMES), SCENES.length - 1);
  const progress = frame / (VIDEO_DURATION_IN_FRAMES - 1);

  return (
    <AbsoluteFill style={styles.page}>
      <BackgroundGrid />
      <Header activeScene={activeScene} progress={progress} />
      <main style={styles.stage}>
        {SCENES.map((scene, index) => (
          <Sequence
            key={scene.kind}
            from={index * SCENE_DURATION_IN_FRAMES}
            durationInFrames={SCENE_DURATION_IN_FRAMES}
          >
            <Scene scene={scene} sceneNumber={index + 1} />
          </Sequence>
        ))}
      </main>
      <Footer activeScene={activeScene} />
    </AbsoluteFill>
  );
};

const BackgroundGrid: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(90deg, rgba(16, 19, 34, 0.045) 1px, transparent 1px), linear-gradient(180deg, rgba(16, 19, 34, 0.035) 1px, transparent 1px)",
        backgroundSize: "58px 58px",
      }}
    />
  );
};

const Header: React.FC<{ activeScene: number; progress: number }> = ({ activeScene, progress }) => {
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <Logo />
        <span>Circle + Sema Agent Marketplace</span>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>
      <div style={styles.counter}>{String(activeScene + 1).padStart(2, "0")} / 06</div>
    </header>
  );
};

const Logo: React.FC = () => {
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" role="img" aria-label="Circle Sema mark">
      <circle cx="29" cy="29" r="27" fill={COLORS.ink} />
      <path
        d="M17 29a12 12 0 0 1 20.5-8.5M41 29a12 12 0 0 1-20.5 8.5"
        fill="none"
        stroke="#f8fafc"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <circle cx="29" cy="29" r="6" fill="#20c997" />
    </svg>
  );
};

const Footer: React.FC<{ activeScene: number }> = ({ activeScene }) => {
  return (
    <footer style={styles.footer}>
      {SCENES.map((scene, index) => (
        <div key={scene.kind} style={styles.timelineItem}>
          <div style={timelineDotStyle(index === activeScene)}>{String(index + 1).padStart(2, "0")}</div>
          <span style={timelineTextStyle(index === activeScene)}>{scene.eyebrow.replace(/^\d\. /, "")}</span>
        </div>
      ))}
    </footer>
  );
};

const Scene: React.FC<{ scene: SceneConfig; sceneNumber: number }> = ({ scene, sceneNumber }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 24, stiffness: 130 } });
  const exit = interpolate(frame, [SCENE_DURATION_IN_FRAMES - 40, SCENE_DURATION_IN_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sceneOpacity = entrance * exit;
  const copyX = interpolate(entrance, [0, 1], [-42, 0]);
  const visualX = interpolate(entrance, [0, 1], [52, 0]);

  return (
    <div style={{ ...styles.scene, opacity: sceneOpacity }}>
      <section style={{ ...styles.copyPanel, transform: `translateX(${copyX}px)` }}>
        <p style={styles.eyebrow}>{scene.eyebrow}</p>
        <h1 style={styles.title}>{scene.title}</h1>
        <p style={styles.lede}>{scene.lede}</p>
        <div style={styles.proofPoints}>
          {scene.points.map((point) => (
            <span key={point} style={styles.proofPoint}>
              {point}
            </span>
          ))}
        </div>
        <div style={styles.chapterTag}>Chapter {sceneNumber}</div>
      </section>
      <section style={{ ...styles.visualPanel, transform: `translateX(${visualX}px)` }}>
        <SceneVisual kind={scene.kind} />
      </section>
    </div>
  );
};

const SceneVisual: React.FC<{ kind: SceneKind }> = ({ kind }) => {
  switch (kind) {
    case "pitch":
      return <PitchVisual />;
    case "seller":
      return <SellerVisual />;
    case "trust":
      return <TrustVisual />;
    case "buyer":
      return <BuyerVisual />;
    case "payment":
      return <PaymentVisual />;
    case "flywheel":
      return <FlywheelVisual />;
  }
};

const PitchVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const listing = moveBetween(frame, 42, 154, 84, 244, 394, 244);
  const usdc = moveBetween(frame, 112, 214, 704, 244, 436, 244);
  const data = moveBetween(frame, 184, 278, 436, 462, 704, 462);

  return (
    <div style={styles.visualCanvas}>
      <NodeCard label="Seller agent" title="Local value" detail="packs, intros, proofs" x={74} y={148} color={COLORS.blue} />
      <Hub />
      <NodeCard label="Buyer agent" title="Real need" detail="searches, pays, reviews" x={656} y={148} color={COLORS.teal} />
      <FlowLine x={270} y={252} width={184} />
      <FlowLine x={550} y={252} width={184} />
      <FlowLine x={454} y={468} width={286} />
      <Packet label="listing" color={COLORS.blue} style={listing} />
      <Packet label="USDC" color={COLORS.green} style={usdc} />
      <Packet label="data" color={COLORS.coral} style={data} />
      <MetricStrip />
    </div>
  );
};

const SellerVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const beamWidth = interpolate(frame, [40, 132], [0, 310], clamp);
  const draftIn = springValue(frame, 118);
  const apiPacket = moveBetween(frame, 168, 248, 366, 430, 596, 430);

  return (
    <div style={styles.visualCanvas}>
      <div style={styles.workbench}>
        <span style={styles.smallLabel}>empty shelf</span>
        <div style={styles.shelfLine} />
        <div style={styles.shelfLineShort} />
        <div style={{ ...styles.scanBeam, width: beamWidth }} />
      </div>
      <div style={{ ...styles.draftListing, opacity: draftIn, transform: `scale(${0.88 + draftIn * 0.12})` }}>
        <span>Draft listing</span>
        <strong>Hackathon research pack</strong>
        <small>1 USDC - low risk</small>
      </div>
      <div style={styles.policyRail}>
        <span>approval</span>
        <strong>safe, owned, useful</strong>
      </div>
      <Packet label="create listing" color={COLORS.violet} style={apiPacket} />
      <div style={styles.marketInbox}>
        <span>Marketplace inbox</span>
        <strong>listing accepted</strong>
        <small>seller wallet matches auth token</small>
      </div>
    </div>
  );
};

const TrustVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const normalizerProgress = springValue(frame, 70);
  const first = springValue(frame, 132);
  const second = springValue(frame, 166);
  const third = springValue(frame, 200);

  return (
    <div style={styles.visualCanvas}>
      <div style={styles.incomingCard}>
        <span>raw offer</span>
        <strong>Research pack</strong>
      </div>
      <div style={{ ...styles.normalizer, transform: `scale(${0.92 + normalizerProgress * 0.08})` }}>
        <span>Normalize</span>
        <CodeRow text="Card#6848" />
        <CodeRow text="AcceptSpec#b77c" />
        <CodeRow text="CiteBack#69ec" />
      </div>
      <ResultCard title="Research pack" detail="1 USDC - low risk" y={132} opacity={first} color={COLORS.green} />
      <ResultCard title="Proof service" detail="2 USDC - reputation 5.0" y={276} opacity={second} color={COLORS.gold} />
      <ResultCard title="Warm intro relay" detail="consented handoff" y={420} opacity={third} color={COLORS.coral} />
      <Spark x={632} y={120} delay={60} />
      <Spark x={698} y={514} delay={118} />
    </div>
  );
};

const BuyerVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const challenge = springValue(frame, 52);
  const signature = springValue(frame, 86);
  const bearer = springValue(frame, 120);
  const approval = springValue(frame, 198);

  return (
    <div style={styles.visualCanvas}>
      <div style={styles.buyerAgent}>
        <span>Buyer agent</span>
        <strong>Need: Base data pack</strong>
        <small>Circle wallet ready</small>
      </div>
      <AuthChip text="challenge" x={366} y={112} opacity={challenge} color={COLORS.blue} />
      <AuthChip text="signature" x={474} y={202} opacity={signature} color={COLORS.violet} />
      <AuthChip text="bearer token" x={582} y={292} opacity={bearer} color={COLORS.green} />
      <div style={styles.catalogScreen}>
        <span>Search results</span>
        <CatalogRow muted text="Warm intro - 3 USDC" />
        <CatalogRow selected text="Research pack - 1 USDC" />
        <CatalogRow muted text="Proof service - 2 USDC" />
      </div>
      <div style={{ ...styles.approvalCard, opacity: approval, transform: `translateY(${(1 - approval) * 28}px)` }}>
        <span>Approval gate</span>
        <strong>Spend 1 USDC?</strong>
      </div>
    </div>
  );
};

const PaymentVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const unlock = springValue(frame, 190);
  const coinOne = moveBetween(frame, 72, 174, 274, 240, 506, 240);
  const coinTwo = moveBetween(frame, 96, 198, 274, 314, 506, 314);
  const coinThree = moveBetween(frame, 120, 222, 274, 388, 506, 388);

  return (
    <div style={styles.visualCanvas}>
      <div style={styles.lockedEndpoint}>
        <span>Delivery endpoint</span>
        <strong>402 payment required</strong>
        <small>/api/deliver/listing-id</small>
      </div>
      <Packet label="USDC" color={COLORS.green} style={coinOne} />
      <Packet label="USDC" color={COLORS.green} style={coinTwo} />
      <Packet label="USDC" color={COLORS.green} style={coinThree} />
      <div style={styles.gatewayBox}>
        <span>Circle Gateway</span>
        <strong>x402 checkout</strong>
      </div>
      <div style={{ ...styles.unlockPanel, opacity: unlock, transform: `scale(${0.9 + unlock * 0.1})` }}>
        <span>Paid response</span>
        <strong>purchaseId + receipt</strong>
        <small>deliverable or awaiting seller</small>
      </div>
    </div>
  );
};

const FlywheelVisual: React.FC = () => {
  const frame = useCurrentFrame();
  const rotate = interpolate(frame, [0, SCENE_DURATION_IN_FRAMES], [0, 14], clamp);
  const data = springValue(frame, 48);
  const review = springValue(frame, 112);
  const payout = springValue(frame, 176);
  const banner = springValue(frame, 220);

  return (
    <div style={styles.visualCanvas}>
      <div style={{ ...styles.loopOrbit, transform: `rotate(${rotate}deg)` }} />
      <LoopNode title="Data delivered" detail="payload, file, repo, link" x={312} y={96} opacity={data} color={COLORS.blue} />
      <LoopNode title="Buyer review" detail="5/5 verified" x={590} y={328} opacity={review} color={COLORS.teal} />
      <LoopNode title="Seller payout" detail="pending to paid" x={126} y={378} opacity={payout} color={COLORS.green} />
      <div style={{ ...styles.judgeBanner, opacity: banner, transform: `translateY(${(1 - banner) * 32}px)` }}>
        <span>Why judges care</span>
        <strong>real payments, useful data, repeatable trust</strong>
      </div>
    </div>
  );
};

const NodeCard: React.FC<{ label: string; title: string; detail: string; x: number; y: number; color: string }> = ({
  label,
  title,
  detail,
  x,
  y,
  color,
}) => {
  return (
    <div style={{ ...styles.nodeCard, left: x, top: y, borderColor: color }}>
      <span style={{ color }}>{label}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
};

const Hub: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 12), [-1, 1], [0.96, 1.03]);

  return (
    <div style={{ ...styles.hub, transform: `translate(-50%, -50%) scale(${pulse})` }}>
      <span>Marketplace</span>
      <strong>Sema + x402</strong>
      <small>trust, pricing, receipts</small>
    </div>
  );
};

const FlowLine: React.FC<{ x: number; y: number; width: number }> = ({ x, y, width }) => {
  return <div style={{ ...styles.flowLine, left: x, top: y, width }} />;
};

const Packet: React.FC<{ label: string; color: string; style: CSSProperties }> = ({ label, color, style }) => {
  return (
    <div style={{ ...styles.packet, ...style, background: color }}>
      {label}
    </div>
  );
};

const MetricStrip: React.FC = () => {
  return (
    <div style={styles.metricStrip}>
      <Metric value="402" label="payment gate" color={COLORS.coral} />
      <Metric value="USDC" label="settlement" color={COLORS.green} />
      <Metric value="Sema" label="meaning layer" color={COLORS.violet} />
    </div>
  );
};

const Metric: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => {
  return (
    <div style={styles.metric}>
      <strong style={{ color }}>{value}</strong>
      <span>{label}</span>
    </div>
  );
};

const CodeRow: React.FC<{ text: string }> = ({ text }) => {
  return <div style={styles.codeRow}>{text}</div>;
};

const ResultCard: React.FC<{ title: string; detail: string; y: number; opacity: number; color: string }> = ({
  title,
  detail,
  y,
  opacity,
  color,
}) => {
  return (
    <div style={{ ...styles.resultCard, top: y, opacity, transform: `translateX(${(1 - opacity) * 42}px)` }}>
      <div style={{ ...styles.resultAccent, background: color }} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
};

const Spark: React.FC<{ x: number; y: number; delay: number }> = ({ x, y, delay }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [delay, delay + 40, delay + 90], [0, 1, 0.15], clamp);

  return <div style={{ ...styles.spark, left: x, top: y, transform: `scale(${scale}) rotate(45deg)` }} />;
};

const AuthChip: React.FC<{ text: string; x: number; y: number; opacity: number; color: string }> = ({
  text,
  x,
  y,
  opacity,
  color,
}) => {
  return (
    <div style={{ ...styles.authChip, left: x, top: y, opacity, borderColor: color }}>
      {text}
    </div>
  );
};

const CatalogRow: React.FC<{ text: string; selected?: boolean; muted?: boolean }> = ({ text, selected, muted }) => {
  const background = selected ? "#e7f6ef" : "#f8fafc";
  const color = muted ? COLORS.muted : COLORS.ink;

  return <div style={{ ...styles.catalogRow, background, color }}>{text}</div>;
};

const LoopNode: React.FC<{ title: string; detail: string; x: number; y: number; opacity: number; color: string }> = ({
  title,
  detail,
  x,
  y,
  opacity,
  color,
}) => {
  return (
    <div style={{ ...styles.loopNode, left: x, top: y, opacity, borderColor: color }}>
      <span>{title}</span>
      <strong>{detail}</strong>
    </div>
  );
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const springValue = (frame: number, delay: number): number => {
  return spring({
    frame: Math.max(0, frame - delay),
    fps: VIDEO_FPS,
    config: { damping: 22, stiffness: 130 },
  });
};

const moveBetween = (
  frame: number,
  start: number,
  end: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): CSSProperties => {
  const x = interpolate(frame, [start, end], [startX, endX], clamp);
  const y = interpolate(frame, [start, end], [startY, endY], clamp);
  const opacity = interpolate(frame, [start - 20, start, end, end + 18], [0, 1, 1, 0], clamp);

  return {
    left: x,
    top: y,
    opacity,
  };
};

const timelineDotStyle = (active: boolean): CSSProperties => {
  const background = active ? COLORS.ink : COLORS.surface;
  const color = active ? "#ffffff" : COLORS.inkSoft;
  const borderColor = active ? COLORS.ink : COLORS.line;

  return {
    width: 46,
    height: 42,
    display: "grid",
    placeItems: "center",
    border: `1px solid ${borderColor}`,
    borderRadius: 10,
    background,
    color,
    fontSize: 15,
    fontWeight: 820,
  };
};

const timelineTextStyle = (active: boolean): CSSProperties => {
  return {
    color: active ? COLORS.ink : COLORS.muted,
    fontSize: 15,
    fontWeight: active ? 820 : 700,
  };
};

const baseBox: CSSProperties = {
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.95)",
  boxShadow: shadow,
};

const textStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const styles: Record<string, CSSProperties> = {
  page: {
    color: COLORS.ink,
    background: COLORS.page,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    position: "absolute",
    top: 34,
    left: 50,
    right: 50,
    height: 78,
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 560px auto",
    alignItems: "center",
    gap: 24,
    padding: "0 22px",
    ...baseBox,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
    fontSize: 24,
    fontWeight: 820,
  },
  progressTrack: {
    height: 12,
    overflow: "hidden",
    borderRadius: 999,
    background: COLORS.surfaceStrong,
    border: `1px solid ${COLORS.line}`,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.teal}, ${COLORS.green})`,
  },
  counter: {
    width: 114,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: COLORS.surfaceStrong,
    border: `1px solid ${COLORS.line}`,
    fontSize: 18,
    fontWeight: 820,
  },
  stage: {
    position: "absolute",
    inset: "132px 50px 106px",
  },
  scene: {
    width: "100%",
    height: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.12fr)",
    gap: 26,
  },
  copyPanel: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 24,
    padding: "58px 62px",
    ...baseBox,
  },
  eyebrow: {
    margin: 0,
    color: COLORS.teal,
    fontSize: 18,
    fontWeight: 840,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: COLORS.ink,
    fontSize: 66,
    lineHeight: 1.02,
    letterSpacing: 0,
    fontWeight: 860,
  },
  lede: {
    maxWidth: 700,
    margin: 0,
    color: COLORS.inkSoft,
    fontSize: 26,
    lineHeight: 1.42,
    letterSpacing: 0,
  },
  proofPoints: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  proofPoint: {
    minHeight: 46,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 16px",
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    background: "#f8fafc",
    color: COLORS.inkSoft,
    fontSize: 18,
    fontWeight: 760,
  },
  chapterTag: {
    position: "absolute",
    right: 24,
    bottom: 22,
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: 760,
  },
  visualPanel: {
    position: "relative",
    overflow: "hidden",
    minWidth: 0,
    ...baseBox,
    background:
      "linear-gradient(135deg, rgba(35, 100, 210, 0.08), transparent 42%), linear-gradient(315deg, rgba(22, 140, 132, 0.11), transparent 44%), #fbfcfd",
  },
  visualCanvas: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  footer: {
    position: "absolute",
    left: 50,
    right: 50,
    bottom: 28,
    height: 62,
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 12,
  },
  timelineItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  nodeCard: {
    position: "absolute",
    width: 220,
    minHeight: 134,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 8,
    background: "#ffffff",
    boxShadow: "0 16px 50px rgba(16, 19, 34, 0.13)",
  },
  hub: {
    position: "absolute",
    left: "50%",
    top: 258,
    width: 236,
    height: 164,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    background: COLORS.ink,
    color: "#ffffff",
    boxShadow: "0 18px 70px rgba(16, 19, 34, 0.28)",
  },
  flowLine: {
    position: "absolute",
    height: 3,
    background: `linear-gradient(90deg, transparent, ${COLORS.line}, transparent)`,
  },
  packet: {
    position: "absolute",
    minWidth: 86,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 840,
    boxShadow: "0 12px 28px rgba(16, 19, 34, 0.18)",
  },
  metricStrip: {
    position: "absolute",
    left: 80,
    right: 80,
    bottom: 64,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  metric: {
    minHeight: 92,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.86)",
  },
  workbench: {
    position: "absolute",
    left: 72,
    top: 110,
    width: 338,
    height: 230,
    padding: 24,
    ...baseBox,
  },
  smallLabel: {
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: 760,
  },
  shelfLine: {
    width: 270,
    height: 12,
    marginTop: 52,
    borderRadius: 999,
    background: COLORS.surfaceStrong,
  },
  shelfLineShort: {
    width: 190,
    height: 12,
    marginTop: 24,
    borderRadius: 999,
    background: COLORS.surfaceStrong,
  },
  scanBeam: {
    position: "absolute",
    left: 14,
    bottom: 24,
    height: 64,
    borderRadius: 8,
    background: "linear-gradient(90deg, rgba(35, 100, 210, 0), rgba(35, 100, 210, 0.28))",
  },
  draftListing: {
    position: "absolute",
    left: 132,
    top: 384,
    width: 338,
    minHeight: 142,
    padding: 22,
    ...baseBox,
    ...textStack,
  },
  policyRail: {
    position: "absolute",
    left: 456,
    top: 150,
    width: 210,
    height: 116,
    padding: 18,
    borderRadius: 8,
    background: COLORS.ink,
    color: "#ffffff",
    ...textStack,
  },
  marketInbox: {
    position: "absolute",
    right: 72,
    top: 350,
    width: 306,
    minHeight: 160,
    padding: 22,
    ...baseBox,
    ...textStack,
  },
  incomingCard: {
    position: "absolute",
    left: 72,
    top: 234,
    width: 220,
    minHeight: 118,
    padding: 20,
    ...baseBox,
    ...textStack,
  },
  normalizer: {
    position: "absolute",
    left: 332,
    top: 162,
    width: 250,
    minHeight: 268,
    padding: 22,
    background: COLORS.ink,
    color: "#ffffff",
    borderRadius: 8,
    boxShadow: "0 18px 70px rgba(16, 19, 34, 0.28)",
  },
  codeRow: {
    height: 42,
    display: "flex",
    alignItems: "center",
    marginTop: 16,
    padding: "0 12px",
    borderRadius: 8,
    background: "rgba(255, 255, 255, 0.12)",
    color: "#f8fafc",
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: 16,
    fontWeight: 720,
  },
  resultCard: {
    position: "absolute",
    right: 72,
    width: 292,
    minHeight: 104,
    padding: "20px 20px 20px 32px",
    ...baseBox,
    ...textStack,
  },
  resultAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    borderRadius: "8px 0 0 8px",
  },
  spark: {
    position: "absolute",
    width: 26,
    height: 26,
    background: COLORS.gold,
    borderRadius: 5,
    boxShadow: "0 0 44px rgba(200, 137, 8, 0.35)",
  },
  buyerAgent: {
    position: "absolute",
    left: 70,
    top: 110,
    width: 260,
    minHeight: 154,
    padding: 22,
    ...baseBox,
    ...textStack,
  },
  authChip: {
    position: "absolute",
    minWidth: 134,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 8,
    background: "#ffffff",
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: 800,
    boxShadow: "0 12px 26px rgba(16, 19, 34, 0.12)",
  },
  catalogScreen: {
    position: "absolute",
    left: 386,
    top: 360,
    width: 338,
    minHeight: 216,
    padding: 22,
    ...baseBox,
  },
  catalogRow: {
    height: 42,
    display: "flex",
    alignItems: "center",
    marginTop: 12,
    padding: "0 14px",
    borderRadius: 8,
    border: `1px solid ${COLORS.line}`,
    fontSize: 16,
    fontWeight: 760,
  },
  approvalCard: {
    position: "absolute",
    right: 78,
    top: 148,
    width: 252,
    minHeight: 138,
    padding: 22,
    borderRadius: 8,
    color: "#ffffff",
    background: COLORS.ink,
    boxShadow: "0 18px 70px rgba(16, 19, 34, 0.28)",
    ...textStack,
  },
  lockedEndpoint: {
    position: "absolute",
    left: 80,
    top: 186,
    width: 310,
    minHeight: 164,
    padding: 24,
    borderRadius: 8,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: COLORS.ink,
    ...textStack,
  },
  gatewayBox: {
    position: "absolute",
    left: 462,
    top: 218,
    width: 250,
    minHeight: 154,
    padding: 24,
    background: COLORS.ink,
    borderRadius: 8,
    color: "#ffffff",
    boxShadow: "0 18px 70px rgba(16, 19, 34, 0.28)",
    ...textStack,
  },
  unlockPanel: {
    position: "absolute",
    right: 76,
    top: 382,
    width: 318,
    minHeight: 166,
    padding: 24,
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    background: "#f0fdf4",
    color: COLORS.ink,
    boxShadow: shadow,
    ...textStack,
  },
  loopOrbit: {
    position: "absolute",
    left: 188,
    top: 80,
    width: 512,
    height: 512,
    borderRadius: "50%",
    border: `3px dashed ${COLORS.line}`,
  },
  loopNode: {
    position: "absolute",
    width: 238,
    minHeight: 118,
    padding: 20,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 8,
    background: "#ffffff",
    boxShadow: "0 16px 50px rgba(16, 19, 34, 0.13)",
    ...textStack,
  },
  judgeBanner: {
    position: "absolute",
    left: 156,
    right: 156,
    bottom: 70,
    minHeight: 112,
    padding: 24,
    borderRadius: 8,
    background: COLORS.ink,
    color: "#ffffff",
    boxShadow: "0 18px 70px rgba(16, 19, 34, 0.28)",
    ...textStack,
  },
};
