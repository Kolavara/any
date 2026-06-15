import { useEffect, useRef, useState } from 'react';

const LINES = [
  { text: 'I know the fog gets thick sometimes.',    cls: 'letter-line',      delay: 0 },
  { text: 'But I\'m right here underneath it.',       cls: 'letter-line',      delay: 650 },
  { text: '· · ·',                                    cls: 'letter-ornament',  delay: 1150 },
  { text: 'Aru and Anu. Always together.',             cls: 'letter-line heart', delay: 1500 },
  { text: '· · ·',                                    cls: 'letter-ornament',  delay: 2100 },
  { text: 'Take all the time you need.',               cls: 'letter-line',      delay: 2500 },
  { text: 'I\'m never giving up on you.',              cls: 'letter-line',      delay: 3100 },
];
const SIGNATURE = { text: '— yours, always', delay: 3900 };

export default function Letter({ visible }) {
  const [shown, setShown] = useState([]);
  const [sigVisible, setSigVisible] = useState(false);
  const timerRefs = useRef([]);

  useEffect(() => {
    if (!visible) return;

    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    LINES.forEach((line, i) => {
      const id = setTimeout(() => {
        setShown(prev => [...prev, i]);
      }, line.delay + 300);
      timerRefs.current.push(id);
    });

    const sigId = setTimeout(() => setSigVisible(true), SIGNATURE.delay + 300);
    timerRefs.current.push(sigId);

    return () => timerRefs.current.forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="letter-wrap">
      {LINES.map((line, i) => {
        const isVisible = shown.includes(i);
        const cls = `${line.cls}${isVisible ? ' visible' : ''}`;
        return (
          <span
            key={i}
            className={cls}
            style={{ transitionDelay: '0ms' }}
          >
            {line.text}
          </span>
        );
      })}
      <span className={`letter-signature${sigVisible ? ' visible' : ''}`}>
        {SIGNATURE.text}
      </span>
    </div>
  );
}
