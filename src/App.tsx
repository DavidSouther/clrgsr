import { useCallback, useMemo, useState } from "react";
import "./App.css";

enum GuesserDifficulty {
  Easy, // 6 hues, 4 saturation, 4 value
  Medium, // 16 hues, 8 saturation, 8 value
  Hard, // 64 hues, 16 saturation, 16 value
}

// 1 2 3 4 5  6  7
// 1 2 4 8 16 32 64

// Seed bits: 0hhhhhhhllllssss
// Hue, Hard: bits & 0x7F00 >> 8
//      Medium: bits & 0x1F00 >> 8
//      Easy: bits[9] ? bits & 0x300 >> 8 : (bits & 0x600 >> 9) + 4
// Sat, Hard: bits & 0xF0 >> 4
//      Medium: bits & 0x70 >> 4
//      Easy: bits & 0x30 >> 4
// Val, Hard: bits & 0xF

function makeHSV(
  difficulty: GuesserDifficulty,
  seed: number
): [number, number, number] {
  switch (difficulty) {
    case GuesserDifficulty.Easy:
      return makeHSVEasy(seed);
    case GuesserDifficulty.Medium:
      return makeHSVMedium(seed);
    case GuesserDifficulty.Hard:
      return makeHSVHard(seed);
  }
}

function makeHSVEasy(seed: number): [number, number, number] {
  let hue = (seed & (0xff00 >> 8)) / 6;
  hue = ((360 / 6) * hue) % 360;
  const val = (100 / 4) * ((seed & (0xf0 >> 4)) / 4);
  const sat = (100 / 4) * ((seed & 0xf) / 4);

  return [hue, val, sat];
}

function makeHSVMedium(seed: number): [number, number, number] {
  const hue = (((360 / 16) * (seed & (0xff00 >> 8))) / 16) % 360;
  const val = (100 / 8) * ((seed & (0xf0 >> 4)) / 2);
  const sat = (100 / 8) * ((seed & 0xf) / 2);

  return [hue, val, sat];
}

function makeHSVHard(seed: number): [number, number, number] {
  const hue = ((360 / 64) * (seed & (0x7f00 >> 8))) % 360;
  const val = (100 / 16) * (seed & (0xf0 >> 4));
  const sat = (100 / 16) * (seed & 0xf);

  return [hue, val, sat];
}

const TWIST = [32771, 16411, 14009, 11003];

function next(seed: number) {
  const next = (seed * 65521) ^ TWIST[seed & 0x3];
  return next;
}

interface GuesserSession {
  guessed: number;
  score: number;
  difficulty: GuesserDifficulty;
  seed: number;
}

interface GuesserRound {
  hue: number;
  saturation: number;
  value: number;
  checking: boolean;
  seed: number;
}

function initSession(): GuesserSession {
  return {
    guessed: 0,
    score: 0,
    difficulty: GuesserDifficulty.Easy,
    seed: Date.now() & 0xffff,
  };
}

function makeRound(difficulty: GuesserDifficulty, seed: number): GuesserRound {
  const [hue, saturation, value] = makeHSV(difficulty, seed);

  seed = next(seed);

  return {
    hue,
    saturation,
    value,
    seed,
    checking: false,
  };
}

const HUE_STEPS = {
  [GuesserDifficulty.Easy]: 7,
  [GuesserDifficulty.Medium]: 17,
  [GuesserDifficulty.Hard]: 65,
};

const SV_STEPS = {
  [GuesserDifficulty.Easy]: 5,
  [GuesserDifficulty.Medium]: 9,
  [GuesserDifficulty.Hard]: 17,
};

function App() {
  const [session, setSession] = useState<GuesserSession>(initSession());
  const [round, setRound] = useState(
    makeRound(session.difficulty, session.seed)
  );

  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0);
  const [val, setVal] = useState(0);

  const doCheck = useCallback(() => {
    let guessed = session.guessed + 1;
    let score =
      session.score +
      (hue === round.hue && sat === round.saturation && val === round.value
        ? 1
        : 0);
    setRound({ ...round, checking: true });
    setSession({ ...session, guessed, score });
  }, [round, session, hue, sat, val]);

  const doNext = useCallback(() => {
    setRound(makeRound(session.difficulty, round.seed));
  }, [session.difficulty, round.seed]);

  const debug = useMemo(() => {
    const debug = [];
    let seed = round.seed;
    for (let i = 0; i < 10; i++) {
      const [h, s, v] = makeHSV(session.difficulty, seed);
      debug.push(
        <tr key={i}>
          <td>{seed}</td>
          <td>{h}</td>
          <td>{s}</td>
          <td>{v}</td>
        </tr>
      );
      seed = next(seed);
    }
    return debug;
  }, [round.seed, session.difficulty]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div>Guessed: {session.guessed}</div>
        <div>Score: {session.score}</div>
        <div>Difficulty: {session.difficulty}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div>
          <label>
            Hue: {hue.toFixed(0)}
            <input
              type="range"
              min={0}
              max={360}
              step={360 / HUE_STEPS[session.difficulty]}
              onChange={({ target }) => setHue(Number(target.value))}
            />
            {round.checking && (
              <input
                type="range"
                min={0}
                max={360}
                step={360 / HUE_STEPS[session.difficulty]}
                value={round.hue}
                disabled={true}
              />
            )}
          </label>
          <label>
            Saturation: {sat.toFixed(0)}
            <input
              type="range"
              min={0}
              max={100}
              step={100 / SV_STEPS[session.difficulty]}
              onChange={({ target }) => setSat(Number(target.value))}
            />
            {round.checking && (
              <input
                type="range"
                min={0}
                max={100}
                step={100 / SV_STEPS[session.difficulty]}
                value={round.saturation}
                disabled={true}
              />
            )}
          </label>
          <label>
            Value: {val.toFixed(0)}
            <input
              type="range"
              min={0}
              max={100}
              step={100 / SV_STEPS[session.difficulty]}
              onChange={({ target }) => setVal(Number(target.value))}
            />
            {round.checking && (
              <input
                type="range"
                min={0}
                max={100}
                step={100 / SV_STEPS[session.difficulty]}
                value={round.value}
                disabled={true}
              />
            )}
          </label>
        </div>
        <div>
          <button onClick={() => (round.checking ? doNext() : doCheck())}>
            {round.checking ? "Next" : "Check"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          style={{
            width: "80%",
            height: "300px",
            backgroundColor: `hsl(${round.hue}deg ${round.saturation}% ${round.value}%)`,
          }}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>Seed</th>
            <th>Hue</th>
            <th>Saturation</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>{debug}</tbody>
      </table>
    </div>
  );
}

export default App;
