import Nav from "./Nav";
import Header from "./Header";
import SectionDescription from "./SectionDescription";
import SectionFeature from "./SectionFeatures";
import SectionQuizz from "./SectionQuizz";
import Footer from "./Footer";

function HomePage() {
  return (
    <div>
      <Header />
      <Nav />
      <main>
        <SectionDescription />
        <SectionFeature />
        <SectionQuizz />
        <Footer />
      </main>
    </div>
  );
}

export default HomePage;
