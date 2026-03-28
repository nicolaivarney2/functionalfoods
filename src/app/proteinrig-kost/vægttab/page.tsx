'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowLeft, Scale, Flame, Heart, Brain, Check, Zap, Target, BookOpen } from 'lucide-react'
import { Cite } from '@/components/Cite'

export default function ProteinrigKostWeightLossTheoryPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/proteinrig-kost" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Proteinrig kost
          </Link>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Proteinrig kost & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Proteinrig kost for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan proteinrig kost kan hjælpe dig med at tabe dig gennem optimal næring og højt proteinindhold.
          </p>
        </div>
      </section>

      {/* Hvad er en proteinrig kost? */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
              Hvad er en proteinrig kost?
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
              <p>
                En proteinrig kost er en kost, hvor en større andel af kalorierne kommer fra protein end i en typisk balanceret kost. I praksis betyder det, at du øger dit indtag af magre proteinkilder – som fisk, fjerkræ, æg, mejeriprodukter og bælgfrugter – på bekostning af noget af kulhydratet og fedtet.
              </p>

              <p>
                Almindelige kostanbefalinger for voksne siger, at cirka 10-15% af energien bør komme fra protein (svarende til omkring 0,8 g protein per kilo kropsvægt om dagen).<Cite n={1} /><Cite n={12} /> En proteinrig kost ligger derimod højere – ofte 20-30% af kalorierne eller mere end ~1,2 g protein/kg kropsvægt.
              </p>

              <div className="bg-purple-50 rounded-xl p-6 border-l-4 border-purple-600">
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Praktisk eksempel:
                </p>
                <p className="text-gray-700">
                  Hvis du normalt spiser ~15% af dine kalorier som protein, vil en proteinrig kost hæve dette til måske 25-30% eller derover. Samtidig reduceres andelen af kulhydrat eller fedt en smule for at holde det samlede kalorieindtag passende.
                </p>
              </div>

              <p>
                Modsat visse ekstreme diæter udelukker en proteinrig kost ikke de andre makronæringsstoffer; den prioriterer blot protein lidt højere i måltiderne. Resultatet er en kost, hvor tallerkenen ofte indeholder relativt mere kød, fisk, æg, bønner eller andre proteinkilder, mens portionerne af stivelsesholdige fødevarer som pasta, ris, brød etc. er moderat mindre end normalt.
              </p>
            </div>

            <figure className="mt-12 max-w-4xl mx-auto">
              <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                <Image
                  src="/billeder/nicher/proteinrig/more-protein-for-weightloss-3-1.png"
                  alt="To tallerkenversioner: almindelig fordeling med mindre protein og mere pasta eller ris, og proteinrig fordeling med større andel kylling, fisk eller bønner og mindre stivelse."
                  width={1200}
                  height={675}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Protein øger mæthed og sænker appetitten */}
      <section className="py-20 bg-gradient-to-br from-purple-50/50 via-white to-green-50/50">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Protein øger mæthed og sænker appetitten
              </h2>
            </div>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
              <p>
                En af de vigtigste årsager til, at en proteinrig kost kan fremme vægttab, er dens effekt på mæthed. Protein mætter generelt mere per kalorie end både kulhydrat og fedt. Studier har vist, at personer føler sig betydeligt mere mætte efter et proteinrigt måltid sammenlignet med et kulhydratrigt eller fedtrigt måltid med samme kaloriemængde.<Cite n={2} /><Cite n={3} />
              </p>

              <p>
                Faktisk anses protein for at være det mest mættende makronæringsstof, efterfulgt af kulhydrat, mens fedt mætter mindst.<Cite n={3} /> Når mæthedsfornemmelsen øges, vil du typisk spise færre kalorier resten af dagen – helt af sig selv. Denne spontant lavere appetit er afgørende for et succesfuldt vægttab, da det hjælper dig med at opnå et kalorieunderskud uden konstant sult.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-purple-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Hvorfor bliver man mere mæt af protein?
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  Forklaringen ligger i både fordøjelsen og kroppens hormonelle respons. Proteiner kræver længere tid at fordøje og giver dermed en mere langvarig fyldefornemmelse i maven.
                </p>
                <p>
                  Samtidig påvirker protein de appetitregulerende hormoner i kroppen: Et proteinrigt måltid stimulerer frigørelsen af mæthedshormoner fra tarmen – herunder <strong>GLP-1, PYY og CCK</strong>, som alle sender signal til hjernen om at du er ved at være mæt – og det dæmper samtidig niveauerne af sulthormonet <strong>ghrelin</strong>.<Cite n={4} />
                </p>
                <p>
                  Denne kombination (mere mæthedshormon og mindre ghrelin) betyder, at hjernen modtager et kraftigt "stop med at spise" signal. Protein ser også ud til at sænke hastigheden af mave-tømning, så maden bliver længere i maven, hvilket yderligere forlænger mæthedsfornemmelsen.
                </p>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-600">
              <p className="text-gray-800 leading-relaxed">
                <strong>I praksis:</strong> Alt i alt medfører et proteinrigt måltid, at du føler dig tilfreds og mæt i længere tid og automatisk ender med at spise mindre i løbet af dagen. Som en metafor kan man sige, at protein "fyrer op under" mæthedscenteret og holder ilden ved lige, mens fx hurtigt sukker er som papir, der brænder op med det samme – protein giver en mere stabil og langvarig mæthed, der hjælper dig med at undgå unødvendige småspisninger.
              </p>
            </div>

            <figure className="mt-12 max-w-4xl mx-auto">
              <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                <Image
                  src="/billeder/nicher/proteinrig/satiety-protein.webp"
                  alt="Graf der sammenligner mæthed over tid: proteinmåltid holder mætheden længere, kulhydratmåltid falder hurtigere."
                  width={940}
                  height={528}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Bevaring af muskelmasse og fremme af fedttab */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Bevaring af muskelmasse og fremme af fedttab
              </h2>
            </div>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
              <p>
                Når du taber sig, vil du ideelt set tabe fedtmasse men bevare din muskelmasse (fedtfri masse). Musklerne er vigtige for styrke, funktion og ikke mindst for kroppens hvilestofskifte (den kalorieforbrænding kroppen har i hvile).
              </p>

              <p>
                En udfordring ved traditionelle slankekure er, at kroppen ofte nedbryder noget muskelvæv, når den er i kalorieunderskud – især hvis proteinindtaget er lavt. Her udmærker en proteinrig kost sig ved at beskytte musklerne under vægttab. Tilstrækkeligt protein giver nemlig byggesten (aminosyrer) til muskelvedligeholdelse, selv når du er på skrump.<Cite n={13} />
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-green-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600" />
                Evidensen for muskelbeskyttelse
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  Evidensen for dette er solid: Sammenlignende forsøg har vist, at personer på høj-proteinkure bevarer mere af deres muskelmasse end personer på vægttabskure med lavere proteinindhold.<Cite n={5} />
                </p>
                <p>
                  For eksempel fandt en meta-analyse af 24 vægttabsstudier (over 1000 deltagere), at en høj-proteinkost (cirka 25-35% af kalorierne fra protein) gav et signifikant større vægttab og især et større fedttab sammenlignet med en mere proteinfattig kost – samtidig med at der blev skånet muskelvæv.<Cite n={5} />
                </p>
                <p className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <strong>I gennemsnit:</strong> Høj-protein-grupperne tabte sig ~0,8 kg mere, hvoraf det meste var fedt, og de holdt på ca. 0,4 kg ekstra muskelmasse i forhold til dem, der fik mindre protein. Med andre ord kom et større fald i vægten fra fedtdepoterne fremfor musklerne, når proteinandelen var høj.<Cite n={5} />
                </p>
                <p>
                  Dette gør en stor forskel for kroppens sammensætning og efterlader dig med en stærkere, mere tonet krop efter vægttabet.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-600 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Effekten på stofskiftet</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                Normalt vil kroppens forbrænding sænkes under vægttab – et fænomen kendt som <strong>metabolisk adaptation</strong> eller <strong>adaptiv termogenese</strong>, hvor kroppen sparer på energien og gør det sværere at tabe sig yderligere.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Men en proteinrig kost ser ud til at modvirke det store fald i forbrænding, bl.a. fordi musklerne bevares bedre. Forskning indikerer, at et højere proteinindtag kan opretholde et højere hvilestofskifte efter vægttab end en kost med mindre protein.<Cite n={2} /> I en stor europæisk undersøgelse fandt man eksempelvis, at personer, som fulgte en høj-proteindiæt, faktisk havde en lidt højere hvileforbrænding og oplevede mindre &quot;nedgearing&quot; af stofskiftet efter vægttab sammenlignet med dem på en moderat-protein kost.<Cite n={6} />
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Kombinationen af bedre muskelbevarelse og en mindre nedgang i stofskiftet gør høj-protein strategien særdeles effektiv til at fremme fedttab frem for muskeltab og potentielt lettere holde vægten nede bagefter.
            </p>

            <figure className="mt-12 max-w-3xl mx-auto">
              <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                <Image
                  src="/billeder/nicher/proteinrig/protein-retain-on-weightloss.webp"
                  alt="Sammenligning af vægttab: høj-proteinkost bevarer muskelmasse mens fedt tabes; almindelig kost kan give både muskel- og fedttab."
                  width={1025}
                  height={1025}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Protein øger termogenesen */}
      <section className="py-20 bg-gradient-to-br from-orange-50/50 via-white to-purple-50/50">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Protein øger termogenesen (kalorieforbrænding i kroppen)
              </h2>
            </div>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
              <p>
                Ud over mæthed og muskelbeskyttelse har protein en tredje fedtforbrændende fordel: det øger kroppens termogenese, dvs. den varmeproduktion og energiomsætning, der sker under og efter måltider.
              </p>

              <p>
                Når vi spiser, skal kroppen bruge energi på at fordøje, omsætte og lagre næringsstofferne – dette kaldes <strong>fødeinduceret termogenese</strong> eller <strong>den termiske effekt af føde</strong>. Og her skiller protein sig markant ud: Det koster kroppen relativt flest kalorier at omsætte protein.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-orange-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-600" />
                Den termiske effekt i tal
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  Omkring <strong>20-30% af kalorierne i protein</strong> går faktisk til selve fordøjelsesprocessen og omdannelse i kroppen. Til sammenligning forbruger kulhydrater kun omkring <strong>5-10%</strong> af deres kalorier under omsætning, og fedt endnu lavere (<strong>~0-3%</strong>).<Cite n={7} /><Cite n={8} />
                </p>
                <p>
                  Det vil sige, at hvis du spiser f.eks. 100 kcal rent protein, så "forsvinder" 20-30 kcal som varme og arbejde for kroppen, mens kun 70-80 kcal netto gemmes eller bruges. Spiser du derimod 100 kcal sukker, vil kroppen beholde 90-95 kcal af dem, fordi det er meget lettere at omsætte.
                </p>
              </div>
            </div>

            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
              <p>
                En proteinrig kost giver dermed en slags metabolisk boost – lidt ligesom at have en bil, der bruger mere brændstof på at forarbejde en bestemt type benzin.
              </p>

              <p>
                I praksis er effekten moderat men målbar: Studier med indirekte kalorimetri (hvor man måler folks energiforbrug) viser, at personer, der spiser en kost med fx 30-35% protein, forbrænder flere kalorier i døgnet end folk på en kost med lavere proteinandel.<Cite n={7} />
              </p>

              <div className="bg-orange-50 rounded-xl p-6 border-l-4 border-orange-600">
                <p className="text-gray-800 leading-relaxed">
                  <strong>Eksempel:</strong> Ét forsøg fandt, at en kost med 36% af energien fra protein medførte ca. 70 kcal ekstra forbrænding per dag sammenlignet med en kost på 15% protein – alene på grund af den højere termiske effekt.<Cite n={9} /> 70 kcal lyder måske ikke af meget, men over tid kan det gøre en forskel i vægtregnskabet.
                </p>
              </div>

              <p>
                Det skal understreges, at 36% protein er temmelig højt; selv en mindre justering fra fx 15% til 25% protein i kosten øger forbrændingen en smule hver dag. Det svarer til, at kroppen arbejder lidt hårdere – som en indbygget kalorieforbrænder – hver gang du spiser proteinrigt.
              </p>

              <p>
                I kombination med det nedsatte appetit gør denne effekt det endnu lettere at opnå det kalorieunderskud, der skal til for at tabe sig. Man kan tænke på protein som et "dyrt" brændstof for kroppen: Det er tungt at forbrænde, og derfor snyder man kroppen til at bruge flere af kalorierne på varmedannelse frem for at lagre dem.
              </p>
            </div>

            <figure className="mt-12 max-w-4xl mx-auto">
              <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                <Image
                  src="/billeder/nicher/proteinrig/weight-protein-food.png"
                  alt="Sammenligning af den termiske effekt: omtrentlig andel af måltidskalorier brugt på fordøjelse og omsætning for protein, kulhydrat og fedt."
                  width={1904}
                  height={640}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Mindre cravings og stabilt blodsukker */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Mindre cravings og stabilt blodsukker
              </h2>
            </div>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
              <p>
                En indirekte men vigtig gevinst ved en proteinrig kost er, at den kan reducere cravings (fristelser til usund snack) og stabilisere blodsukkeret gennem dagen. Måske har du oplevet, at et morgenmåltid med hvidt brød eller sukkerholdige fødevarer giver hurtig energi, men få timer senere kommer der en sukkerkollaps, og trangen til søde sager eller kaffe og kage melder sig.
              </p>

              <p>
                Protein kan hjælpe med at bryde denne "blodsukker-berg-og-dal-bane". Fordi protein ikke får blodsukkeret til at stige nær så meget som lette kulhydrater, undgår man de store udsving. Tværtimod har protein en stabiliserende effekt: Det forsinker mavetømningen og dermed optagelsen af eventuelle kulhydrater i måltidet, og kroppen kan sågar omdanne lidt af proteinet til glukose løbende (en proces kaldet <strong>glukoneogenese</strong> i leveren), hvilket forebygger at blodsukkeret dykker for lavt mellem måltider.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-blue-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-blue-600" />
                Evidens for reducerede cravings
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  Der er også konkrete studier, der underbygger, at protein mindsker cravings. I et forsøg lod man voksne spise en proteinrig vs. proteinfattig morgenmad med samme kalorier, og herefter målte man deres blodsukker og sult senere på dagen.<Cite n={10} />
                </p>
                <p className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <strong>Resultatet var slående:</strong> De, der havde fået ekstra protein til morgen, havde lavere blodsukkerniveauer og mindre appetit senere på dagen sammenlignet med dem, der fik mindre protein. Effekten hang sammen med, at protein fordøjes langsommere end kulhydrat – så de proteinrige måltider gav en længere mæthed og mere gradvis energifrigivelse.<Cite n={10} />
                </p>
                <p>
                  Dette er gavnligt for folk der kæmper med eftermiddagscravings: I stedet for at opleve et dyk kl. 15 og gribe ud efter chokoladebaren, vil du med et proteinholdigt frokostmåltid i maven ofte føle dig stabil og mindre fristet.
                </p>
                <p>
                  Andre undersøgelser har ovenikøbet vist, at højere proteinindtag kan påvirke hjernen ved at dæmpe aktiviteten i de områder, der styrer belønningsfølelsen ved mad – proteinet kan altså gøre os mindre "optagede" af tanken om mad, især usunde snacks.<Cite n={11} />
                </p>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-600">
              <p className="text-gray-800 leading-relaxed">
                <strong>I praksis:</strong> Summen af disse effekter er, at en proteinrig kost hjælper med at bryde den onde cirkel af blodsukkerudsving og snacktrang. Du føler dig mæt, dit blodsukker forbliver nogenlunde stabilt, og du bliver ikke på samme måde "slået omkuld" af pludselig sult efter noget sødt. Dette gør det betydeligt nemmere at holde sig til en sund kostplan og opnå vægttab uden at føle sig konstant fristet.
              </p>
            </div>

            <figure className="mt-12 max-w-4xl mx-auto">
              <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                <Image
                  src="/billeder/nicher/proteinrig/blood-glucose-protein-over-time.jpg"
                  alt="Blodsukker over tid: mere stabilt forløb efter proteinrigt måltid sammenlignet med højt sukkerindhold."
                  width={1200}
                  height={823}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Balance frem for udelukkelse */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Balance frem for udelukkelse – for en holdbar livsstil
              </h2>
            </div>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
              <p>
                En proteinrig kost bør ikke forveksles med ekstreme diæter, der forbyder hele fødevaregrupper. I en sund proteinrig vægttabskost er kulhydrater og fedt stadig med – blot i lidt mindre mængder eller i smartere valg. Det handler om balance.
              </p>

              <p>
                Man kunne fristes til at tro, at "hvis protein er godt, så må kulhydrat være dårligt", men sådan forholder det sig ikke. Kulhydrater er kroppens primære brændstof og leverer vigtige fibre, vitaminer og mineraler, mens sunde fedtstoffer er nødvendige for hormonproduktion, cellefunktion og optag af fedtopløselige vitaminer.
              </p>

              <p>
                En proteinrig kost rummer stadig disse næringsstoffer – man skifter blot forholdet lidt til fordel for proteinet. I praksis betyder det måske, at du spiser en mindre portion ris/pasta/kartofler end du plejer og tilføjer en ekstra skefuld kylling, bønner eller skyr. Men du udelukker ikke risene eller pastaen fuldstændigt.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-indigo-200 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-indigo-600" />
                Evidens for holdbarhed
              </h3>
              <div className="space-y-4 text-gray-700">
                <p>
                  Dette er vigtigt for kostens holdbarhed: Når alle fødevaregrupper er tilladt i rimelige mængder, bliver det langt lettere at følge kosten i længden uden at føle afsavn.
                </p>
                <p>
                  Faktisk viser forskning, at moderate justeringer i kostsammensætningen – frem for ekstreme restriktioner – giver de bedste resultater på sigt. Et stort europæisk studie (Diogenes-projektet) undersøgte, hvordan forskellige diæter fungerede til vægtvedligeholdelse efter et vægttab.<Cite n={6} />
                </p>
                <p className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <strong>Resultatet:</strong> Deltagerne på den høj-protein/lav-GI kost havde lettere ved at blive ved deres kost og tog mindre på igen sammenlignet med dem på en mere traditionel kost. Det tyder på, at netop balancen – hvor man undgår ekstreme regler – gør det mere gennemførligt i hverdagen.<Cite n={6} />
                </p>
              </div>
            </div>

            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
              <p>
                En proteinrig kost kan netop indrettes, så den overholder de officielle anbefalinger for en sund kost: Du kan sigte efter fx 25-30% af kalorierne fra protein (hvilket typisk ligger inden for anbefalingerne), omkring 30% fra sunde fedtstoffer, og resten (40-45%) fra kulhydrater af god kvalitet.<Cite n={1} /><Cite n={12} />
              </p>

              <p>
                På den måde får du stadig mindst 500 gram grøntsager og frugt dagligt, fuldkornsprodukter, nødder, planteolier osv., blot mens du prioriterer proteinportionen lidt højere. Denne tilgang gør, at en proteinrig kost mere ligner en livsstilsændring end en kur – den er varieret og fleksibel nok til, at du kan følge den i lang tid.
              </p>

              <div className="bg-purple-50 rounded-xl p-6 border-l-4 border-purple-600">
                <p className="text-gray-800 leading-relaxed">
                  <strong>I praksis:</strong> Du kan stadig nyde fuldkornsbrød, havregryn, frugt og en smule mørk chokolade; du skal blot huske også at få dine proteiner til hvert måltid og måske skifte noget af den raffinerede stivelse ud med grøntsager og ekstra protein. Mange oplever, at det er langt mere holdbart end diæter, hvor man fx slet ikke må få brød eller pasta.
                </p>
              </div>

              <p>
                Afslutningsvis handler en proteinrig kost om at dreje på balance-knappen frem for at fjerne noget fuldstændigt. Netop derfor ser vi, at den kan integreres i en sund madplan på en måde, som giver varige resultater. Du udnytter videnskaben til din fordel – højere mæthed, bevaret muskelmasse, let forhøjet forbrænding og stabilt blodsukker – samtidig med at du bevarer madglæden og fleksibiliteten i kosten.
              </p>
            </div>

            {/* Illustration placeholder */}
            <div className="mt-12 bg-gray-50 rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
              <p className="text-gray-500 text-sm mb-2">
                <strong>Illustration:</strong> En vægtskål eller balance, hvor den ene skål er mærket "Protein" og den anden "Kulhydrat & Fedt". Proteinskålen hælder lidt nedad for at vise øget vægt (andel), men kulhydrat/fedt-skålen er stadig til stede – ikke tom. Dette billedligt gør klart, at det er balancen der ændres, ikke en total udelukkelse. Alternativt en cirkeldiagram (pie chart) der viser en fordeling af kalorier: fx ~30% protein, ~40-45% kulhydrat, ~25-30% fedt, med teksten "Balanceret høj-proteinkost".
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Konklusion */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gradient-to-br from-purple-50 to-green-50 rounded-3xl p-8 md:p-12 border-2 border-purple-200">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
                Konklusion
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                <p>
                  En proteinrig kost kan betragtes som et effektivt og videnskabeligt funderet redskab til vægttab for voksne, der ønsker sunde vaner. Ved at øge proteinandelen i kosten får du flere mæthedsfordele, bedre muskelbeskyttelse og en lille metabolisk fordel, som samlet set kan gøre vægttab lettere og mere bæredygtigt.<Cite n={2} /><Cite n={5} />
                </p>

                <p>
                  Samtidig stabiliserer den appetitten og mindsker cravings, så du ikke konstant kæmper med sult. Både mænd og kvinder kan drage nytte af disse effekter (om end mænd i nogle tilfælde ser en lidt større effekt på vægten).<Cite n={5} />
                </p>

                <p>
                  Det afgørende er, at en proteinrig kost stadig kan være velafbalanceret og sund – det handler ikke om at udelukke kulhydrat eller fedt, men om at finde en varig balance, hvor protein får lov at spille hovedrollen.
                </p>

                <div className="bg-white rounded-xl p-6 border-l-4 border-green-600 mt-6">
                  <p className="text-gray-800 leading-relaxed">
                    <strong>Evidensen peger på:</strong> Kost med omkring 25-30% af kalorierne fra protein kan give betydelige forbedringer i vægtkontrol og kropssammensætning, netop fordi du spontant spiser mindre og taber primært fedt.<Cite n={2} /><Cite n={5} /> Og det bedste er, at denne kost kan skræddersys med masser af grønt, fuldkorn og sunde fedtkilder, så du hverken går sulten i seng eller går glip af vigtige næringsstoffer.
                  </p>
                </div>

                <p>
                  Samlet set fungerer en proteinrig kost som en solid grundpille i en sund vægttabsstrategi – tænk på det som at give kroppen "højoktan brændstof", der holder motoren kørende og forbruget oppe, samtidig med at du som person føler dig mæt og tilfreds.
                </p>

                <p>
                  Det er derfor, at mange ernæringseksperter og studier anser en moderat høj-protein kost for både sikker, gavnlig og praktisk anvendelig som metode til vægttab og vægtvedligeholdelse. Med andre ord: <strong>Protein hjælper dig med at tabe det rigtige (fedtet) og beholde det vigtige (musklerne) – og gør rejsen mod dit vægtmål mere mættende og mindre besværlig.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kilder */}
      <section id="kilder" className="py-16 bg-gradient-to-b from-gray-50 to-white border-t border-gray-200 scroll-mt-20">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-purple-800" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Kilder og referencer
              </h2>
            </div>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Denne side er til <strong>information og inspiration</strong> og erstatter ikke individuel rådgivning fra læge, diætist eller anden godkendt sundhedsfaglig. Tallene i teksten matcher typiske intervaller i litteraturen; enkelte forsøg og metaanalyser afviger – se de primære kilder. Klik på de små tal i teksten for at hoppe til den tilsvarende reference.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
              <ol className="list-none space-y-5 text-sm text-gray-700 leading-relaxed">
                <li id="kilde-1" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">1.</span>
                  <span>
                    <span className="font-medium text-gray-900">Nordiske næringsstofanbefalinger (NNR 2023).</span> Nordisk Ministerråd. Proteinbehov, makrofordeling og principper for en balanceret kost i Norden.{' '}
                    <a href="https://www.norden.org/en/publication/nordic-nutrition-recommendations-2023" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      norden.org – NNR 2023
                    </a>
                  </span>
                </li>
                <li id="kilde-2" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">2.</span>
                  <span>
                    Leidy HJ, Clifton PM, Astrup A, et al. The role of protein in weight loss and maintenance.{' '}
                    <em>Am J Clin Nutr</em>. 2015;101(6):1320S-1329S. (Oversigt: mæthed, energiindtag, kropssammensætning, stofskifte efter vægttab.){' '}
                    <a href="https://doi.org/10.3945/ajcn.114.084038" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.3945/ajcn.114.084038
                    </a>
                  </span>
                </li>
                <li id="kilde-3" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">3.</span>
                  <span>
                    Paddon-Jones D, Westman E, Mattes RD, et al. Protein, weight management, and satiety.{' '}
                    <em>Am J Clin Nutr</em>. 2008;87(5):1558S-1561S. (Protein og mæthedsregulering.){' '}
                    <a href="https://doi.org/10.1093/ajcn/87.5.1558S" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1093/ajcn/87.5.1558S
                    </a>
                  </span>
                </li>
                <li id="kilde-4" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">4.</span>
                  <span>
                    Lejeune MP, Westerterp KR, Adam TC, et al. Ghrelin and glucagon-like peptide 1 concentrations, 24-h satiety, and energy and substrate metabolism during a high-protein diet and measured in a respiration chamber.{' '}
                    <em>Br J Nutr</em>. 2006;95(2):405-411. (Akut hormonrespons ved protein vs. kulhydrat.){' '}
                    <a href="https://doi.org/10.1079/BJN20051634" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1079/BJN20051634
                    </a>
                  </span>
                </li>
                <li id="kilde-5" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">5.</span>
                  <span>
                    Wycherley TP, Noakes M, Clifton PM, et al. Effects of energy-restricted high-protein, low-fat diets compared with standard-protein, low-fat diets: a meta-analysis of randomized controlled trials.{' '}
                    <em>Am J Clin Nutr</em>. 2012;96(6):1281-1298. (Vægttab, fedt- vs. muskelmasse; kønsforskelle diskuteres i primærlitteraturen.){' '}
                    <a href="https://doi.org/10.3945/ajcn.111.026294" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.3945/ajcn.111.026294
                    </a>
                  </span>
                </li>
                <li id="kilde-6" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">6.</span>
                  <span>
                    Larsen TM, et al. Diets with High or Low Protein Content and Glycemic Index for Weight-Loss Maintenance.{' '}
                    <em>N Engl J Med</em>. 2010;363(22):2102-2111. (Diogenes: vægtvedligeholdelse, herunder høj protein / lav GI.){' '}
                    <a href="https://doi.org/10.1056/NEJMoa0907137" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1056/NEJMoa0907137
                    </a>
                  </span>
                </li>
                <li id="kilde-7" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">7.</span>
                  <span>
                    Westerterp KR. Diet induced thermogenesis.{' '}
                    <em>Nutr Metab (Lond)</em>. 2004;1(1):5. (Fødeinduceret termogenese og makronæringsstoffer.){' '}
                    <a href="https://doi.org/10.1186/1743-7075-1-5" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1186/1743-7075-1-5
                    </a>
                  </span>
                </li>
                <li id="kilde-8" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">8.</span>
                  <span>
                    Reed GW, Hill JO. Measuring the thermic effect of food.{' '}
                    <em>Am J Clin Nutr</em>. 1996;63(2):164-169. (Metode og typiske størrelsesordner for TEF.){' '}
                    <a href="https://pubmed.ncbi.nlm.nih.gov/8561060/" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      PubMed
                    </a>
                  </span>
                </li>
                <li id="kilde-9" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">9.</span>
                  <span>
                    Johnston CS, Day CS, Swan PD. Postprandial thermogenesis is increased 100% on a high-protein, low-fat diet versus a high-carbohydrate, low-fat diet in healthy, young women.{' '}
                    <em>J Am Coll Nutr</em>. 2002;21(1):55-61. (Ekstra energiforbrug ved høj vs. lav proteinandel – tal varierer med forsøgsdesign.){' '}
                    <a href="https://doi.org/10.1080/07315724.2002.10719194" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1080/07315724.2002.10719194
                    </a>
                  </span>
                </li>
                <li id="kilde-10" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">10.</span>
                  <span>
                    Leidy HJ, Hoertel HA, Douglas SM, et al. Beneficial effects of a higher-protein breakfast on appetitive, hormonal, and neural signals controlling energy intake regulation in overweight/obese, &quot;breakfast-skipping&quot; adolescents.{' '}
                    <em>Am J Clin Nutr</em>. 2013;98(2):305-314. (Proteinrig morgenmad, appetit og blodsukkerrespons.){' '}
                    <a href="https://doi.org/10.3945/ajcn.112.053482" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.3945/ajcn.112.053482
                    </a>
                  </span>
                </li>
                <li id="kilde-11" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">11.</span>
                  <span>
                    Griffioen-Roose S, et al. Human protein status modulates brain reward responses to food cues.{' '}
                    <em>Physiol Behav</em>. 2014;136:65-69. (Proteinstatus og belønningsrespons over for mad.){' '}
                    <a href="https://doi.org/10.1016/j.physbeh.2014.05.026" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1016/j.physbeh.2014.05.026
                    </a>
                  </span>
                </li>
                <li id="kilde-12" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">12.</span>
                  <span>
                    <span className="font-medium text-gray-900">Officielle danske kostråd.</span> Fødevarestyrelsen / Alt om kost – anbefalinger til befolkningen.{' '}
                    <a href="https://altomkost.dk/" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      altomkost.dk
                    </a>
                  </span>
                </li>
                <li id="kilde-13" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-purple-800 shrink-0 w-6">13.</span>
                  <span>
                    Skov AR, Toubro S, Rønn B, Holm L, Astrup A. Randomized trial on protein vs carbohydrate in ad libitum fat reduced diet for the treatment of obesity.{' '}
                    <em>Int J Obes Relat Metab Disord</em>. 1999;23(5):528-536. (Høj-protein vs. høj-kulhydrat ved vægttab; fedt- og magermasse.){' '}
                    <a href="https://doi.org/10.1038/sj.ijo.0800863" className="text-purple-700 hover:underline break-words" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1038/sj.ijo.0800863
                    </a>
                  </span>
                </li>
              </ol>
            </div>
            <p className="mt-6 text-xs text-gray-500 leading-relaxed">
              Eksemplet med ca. 70 kcal ekstra per døgn ved meget høj proteinandel er et konkret forsøgsresultat; størrelsesordner varierer mellem studier og populationer. Se kilde 9 og sammenlign med oversigter i kilde 2 og 7.
            </p>
          </div>
        </div>
      </section>

      {/* CTA to Proteinrig kost Recipes */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-purple-200">proteinrige opskrifter</span>
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme proteinrige opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/proteinrig-kost/opskrifter"
            className="group bg-white text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se proteinrige opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
