# QA Checklist

Upload
- [ ] 3 PDFs (short/medium/long) parse without errors
- [ ] Page count correct; bytes within limits

Outline
- [ ] Coverage ≥ 95%
- [ ] Mean section length 300–3000 chars
- [ ] Titles sensible; repair pass only when needed

Generation
- [ ] 5 random sections validate against zod
- [ ] Bullets ≤ 8; key terms ≤ 15
- [ ] Tone: plain, factual, short sentences

UI/UX
- [ ] Light/Dark parity
- [ ] Focus rings visible
- [ ] Reduced motion honored
- [ ] No gradients/glass/neumorphism

Export
- [ ] Markdown mirrors UI order

Performance
- [ ] First useful render < 2.5s
- [ ] 100-page PDF parse < 8s (budget)

