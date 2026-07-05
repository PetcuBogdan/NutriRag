export default function SectionHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Introdu analizele tale",
      description:
        "Completează valorile din buletinul de analize (glicemie, colesterol, vitamina D etc.) direct în formular sau importă PDF-ul primit de la laborator. NutriRAG identifică automat valorile anormale.",
    },
    {
      number: "02",
      title: "NutriRAG generează planul",
      description:
        "Sistemul RAG interoghează bazele de date FooDB, PubChem și ADMETLab 3.0, reranking-ul cross-encoder selectează cele mai relevante informații nutriționale, iar GPT-4o construiește un plan alimentar pe 7 zile adaptat profilului tău.",
    },
    {
      number: "03",
      title: "Urmărește și ajustează",
      description:
        "Vizualizează planul zi cu zi, generează rețete pentru fiecare masă, salvează-le în colecție și urmărește caloriile prin jurnalul integrat. Poți regenera planul oricând cu preferințe noi.",
    },
  ];

  return (
    <section className="section-quizz">
      <div className="u-center-text u-margin-bottom-big">
        <h2 className="heading-secundary">Cum funcționează NutriRAG?</h2>
      </div>
      <div className="row">
        {steps.map((step) => (
          <div className="col-1-of-3" key={step.number}>
            <div className="feature-box" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "4rem",
                  fontWeight: 900,
                  color: "var(--color-primary, #55c57a)",
                  lineHeight: 1,
                  marginBottom: "1.2rem",
                  fontFamily: "Lato, sans-serif",
                  letterSpacing: "-0.1rem",
                }}
              >
                {step.number}
              </div>
              <h3 className="heading-tertiary" style={{ marginBottom: "1.2rem" }}>
                {step.title}
              </h3>
              <p className="feature-box__text">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
