-- 🎯 Import Ketoliv Content to Blog System
-- Kør dette script i din Supabase SQL editor

-- Insert sample blog posts based on Ketoliv content
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  category_id,
  author_id,
  meta_title,
  meta_description,
  tags,
  status,
  featured,
  published_at,
  view_count,
  comment_count
) VALUES 
-- Core Articles (Featured)
(
  'Begynderguide til Keto - Alt du skal vide for at komme i gang',
  'begynderguide-til-keto',
  'Keto er en bestemt måde at spise på, hvor man spiser mad, der er rig på fedt, moderat på protein og lavt på kulhydrater. Lær alt du skal vide for at komme i gang med keto i dag.',
  '# Hvad er Keto?

Keto er en bestemt måde at spise på, hvor man spiser mad, der er rig på fedt, moderat på protein og lavt på kulhydrater. Keto kost er blevet utrolig populært, dels fordi mange oplever store resultater, i form af fx. vægttab, men dels også fordi, de opnår det på en relativt nem måde, uden at skulle gå på kompromis med de ting, de kan lide at spise 🥓 🍔 🥗

Med Keto kan man tabe sig, uden den helt store kamp, og uden at føle sig sulten, så længe man holder sig inden for de rammer, som Keto tilbyder. Og overraskende nok, er det nogle rammer der tilbyder både lækker, god og samtidigt sund mad.

## Hvad spiser man på Keto?

På keto spiser du:
- **Fedt:** 70-80% af dine kalorier
- **Protein:** 20-25% af dine kalorier  
- **Kulhydrater:** 5-10% af dine kalorier (under 20g netto kulhydrater om dagen)

### Keto-venlige fødevarer:
- **Kød og fisk:** Oksekød, svinekød, kylling, laks, makrel
- **Fedt:** Smør, kokosolie, olivenolie, avokado
- **Grøntsager:** Spinat, broccoli, avocado, tomater
- **Mejeriprodukter:** Ost, fløde, smør
- **Nødder og frø:** Mandler, valnødder, chiafrø

### Undgå på keto:
- **Kulhydratrige fødevarer:** Brød, pasta, ris, kartofler
- **Sukker:** Kager, slik, sodavand
- **Frugt:** Bananer, æbler, appelsiner (undtagen bær i små mængder)

## Hvordan kommer du i ketose?

Ketose opnås ved at:
1. **Begrænse kulhydrater** til under 20g netto om dagen
2. **Spise nok fedt** for at give kroppen energi
3. **Moderat protein** for at undgå gluconeogenese
4. **Vente 2-7 dage** på at kroppen tilpasser sig

## Keto-flu symptomer

De første dage kan du opleve:
- **Træthed og svaghed**
- **Hovedpine**
- **Irritabilitet**
- **Søvnproblemer**
- **Kuldegysninger**

Dette er normalt og går over efter 3-7 dage.

## Fordele ved keto

- **Effektivt vægttab** uden sult
- **Stabil energi** gennem dagen
- **Forbedret mental klarhed**
- **Reduceret inflammation**
- **Bedre blodsukkerkontrol**

## Kom i gang i dag

1. **Ryd køleskabet** for kulhydratrige fødevarer
2. **Køb keto-venlige ingredienser**
3. **Planlæg dine måltider** for den første uge
4. **Download en keto app** til at tracke makronæringsstoffer
5. **Start i morgen** - ikke næste uge!

Keto kan være livsforandrende, hvis du giver det en fair chance. Start med vores begynderguide og få støtte i vores community.',
  (SELECT id FROM blog_categories WHERE slug = 'keto'),
  (SELECT id FROM auth.users LIMIT 1), -- Placeholder - skal opdateres med rigtig user_id
  'Begynderguide til Keto - Alt du skal vide for at komme i gang',
  'Lær alt om keto diæt: hvad det er, hvad du spiser, og hvordan du kommer i gang. Komplet begynderguide med praktiske tips og råd.',
  ARRAY['keto', 'begynderguide', 'ketose', 'vægttab', 'lav-kulhydrat'],
  'published',
  true,
  NOW(),
  46500,
  0
),

-- Blog Posts
(
  'Træning på Keto - Sådan optimerer du din performance',
  'traening-paa-keto',
  'Træning på keto kan være udfordrende i starten, men med de rigtige strategier kan du opnå fantastiske resultater. Lær hvordan du træner optimalt på keto.',
  '# Træning på Keto - Sådan optimerer du din performance

Træning på keto kan være udfordrende i starten, men med de rigtige strategier kan du opnå fantastiske resultater. Her er alt du skal vide om træning og keto.

## Hvad sker der med din træning på keto?

Når du starter på keto, kan du opleve:
- **Reduceret styrke** i de første 2-4 uger
- **Træthed** under træning
- **Længere restitutionstid**
- **Svære ved at opretholde intensitet**

Dette er normalt og går over, når kroppen tilpasser sig.

## Keto-adaptation perioden

Din krop skal lære at bruge fedt som primær brændstof:
- **Uge 1-2:** Svageste periode
- **Uge 3-4:** Gradvis forbedring
- **Uge 5-6:** Fuld keto-adaptation
- **Uge 8+:** Optimal performance

## Træningsstrategier på keto

### 1. Start roligt
- **Reducer volumen** med 20-30%
- **Fokusér på teknik** frem for vægt
- **Længere pause** mellem sæt

### 2. Timing af måltider
- **Træn på tom mave** om morgenen
- **Spis efter træning** for bedre restitution
- **Undgå store måltider** 2-3 timer før træning

### 3. Hydrering og elektrolytter
- **Drik ekstra vand** (3-4 liter om dagen)
- **Tilføj salt** til din kost
- **Overvej magnesium** og kalium supplementer

## Bedste træningsformer på keto

### Styrketræning
- **Compound øvelser:** Squat, dødløft, bænkpres
- **Moderat volumen:** 3-4 sæt per øvelse
- **Fokus på progression** over tid

### Cardio
- **LISS (Low Intensity Steady State):** Gå, cykel, svøm
- **HIIT:** Korte, intensive intervaller
- **Undgå langvarig cardio** i starten

### Funktionel træning
- **Yoga og pilates** for mobilitet
- **Bodyweight øvelser** for stabilitet
- **Flexibilitetstræning** for præstation

## Supplements til træning på keto

### Essentielle
- **Magnesium:** 400-600mg dagligt
- **Kalium:** 1000-3000mg dagligt
- **Salt:** 2-3g ekstra om dagen

### Performance
- **Kreatin:** 3-5g dagligt
- **Beta-alanin:** 2-3g dagligt
- **Caffeine:** 100-200mg før træning

## Måltider omkring træning

### Før træning (2-3 timer før)
- **Kaffe med MCT olie**
- **Avokado med salt**
- **Kokosnødder**

### Efter træning (inden for 1 time)
- **Protein shake** med fløde
- **Æg med bacon**
- **Laks med grøntsager**

## Fejl at undgå

1. **For hurtig progression** - giv kroppen tid til at tilpasse sig
2. **For lidt salt** - keto gør dig salt-sensitiv
3. **For meget cardio** - fokusér på styrke i starten
4. **Ikke nok vand** - keto øger vandbehovet

## Når det begynder at virke

Efter 4-6 uger kan du opleve:
- **Stabil energi** gennem træningen
- **Bedre mental klarhed**
- **Reduceret inflammation**
- **Forbedret restitution**

## Konklusion

Træning på keto kræver tålmodighed og den rigtige tilgang. Start roligt, fokusér på teknik, og giv kroppen tid til at tilpasse sig. Med de rigtige strategier kan keto faktisk forbedre din træningsperformance på lang sigt.',
  (SELECT id FROM blog_categories WHERE slug = 'keto'),
  (SELECT id FROM auth.users LIMIT 1),
  'Træning på Keto - Sådan optimerer du din performance',
  'Lær hvordan du træner optimalt på keto. Praktiske tips til styrketræning, cardio og restitution på lav-kulhydrat diæt.',
  ARRAY['keto', 'træning', 'fitness', 'performance', 'keto-adaptation'],
  'published',
  false,
  NOW(),
  13874,
  0
),

(
  '8 Faldgruber på vej til Ketose - Sådan undgår du dem',
  '8-faldgruber-paa-vej-til-ketose',
  'Der er mange faldgruber når man starter på keto. Lær de 8 mest almindelige fejl og hvordan du undgår dem for at opnå succes med keto.',
  '# 8 Faldgruber på vej til Ketose - Sådan undgår du dem

Der er mange faldgruber når man starter på keto. Her er de 8 mest almindelige fejl og hvordan du undgår dem.

## 1. For mange kulhydrater

**Problemet:** Du tror du spiser keto, men får faktisk 50-100g kulhydrater om dagen.

**Løsning:** 
- Track alle kulhydrater i en app
- Læs alle etiketter grundigt
- Undgå "skjulte" kulhydrater i krydderier og saucer

## 2. For lidt fedt

**Problemet:** Du spiser for lidt fedt og ender med at være sulten og træt.

**Løsning:**
- Spis fedt til hvert måltid
- Tilføj MCT olie til kaffe
- Vælg fedtrige kødstykker

## 3. For meget protein

**Problemet:** Du spiser for meget protein, hvilket kan sparke dig ud af ketose.

**Løsning:**
- Hold protein til 20-25% af kalorier
- Vælg fedtrige kødstykker
- Spis grøntsager til hvert måltid

## 4. Ikke nok salt

**Problemet:** Keto gør dig salt-sensitiv, og du får ikke nok.

**Løsning:**
- Tilføj salt til alle måltider
- Drik bouillon eller elektrolyt-drik
- Overvej salt-tabletter

## 5. For lidt vand

**Problemet:** Keto øger dit vandbehov markant.

**Løsning:**
- Drik 3-4 liter vand om dagen
- Tilføj salt til vandet
- Drik før du bliver tørstig

## 6. For hurtig progression

**Problemet:** Du vil have resultater i morgen og bliver frustreret.

**Løsning:**
- Giv det mindst 4-6 uger
- Fokusér på proces, ikke resultater
- Tag det en dag ad gangen

## 7. Cheat meals for tidligt

**Problemet:** Du har cheat meals før du er fuldt keto-adaptet.

**Løsning:**
- Vent mindst 6-8 uger
- Planlæg cheat meals strategisk
- Vær realistisk om konsekvenserne

## 8. Ikke nok grøntsager

**Problemet:** Du fokuserer kun på fedt og protein.

**Løsning:**
- Spis grøntsager til hvert måltid
- Vælg lav-kulhydrat grøntsager
- Tilføj fiber for mave-tarm sundhed

## Bonus: Keto-flu håndtering

De første dage kan være hårde:
- **Dag 1-3:** Træthed og hovedpine
- **Dag 4-7:** Gradvis forbedring
- **Uge 2-4:** Fuld keto-adaptation

## Konklusion

Undgå disse faldgruber, og du vil have en meget bedre keto-oplevelse. Husk at keto er en livsstil, ikke en quick fix. Giv det tid og vær tålmodig med processen.',
  (SELECT id FROM blog_categories WHERE slug = 'keto'),
  (SELECT id FROM auth.users LIMIT 1),
  '8 Faldgruber på vej til Ketose - Sådan undgår du dem',
  'Lær de 8 mest almindelige fejl når man starter på keto og hvordan du undgår dem for at opnå succes.',
  ARRAY['keto', 'faldgruber', 'ketose', 'begynderguide', 'fejl'],
  'published',
  false,
  NOW(),
  13898,
  0
),

(
  'Diabetes, Keto og hvorfor Keto kan forbedre din diabetes',
  'diabetes-keto-og-hvorfor-keto-kan-forbedre-din-diabetes',
  'Keto kan være en kraftfuld værktøj til at forbedre blodsukkerkontrol og reducere diabetes symptomer. Lær hvordan keto påvirker diabetes.',
  '# Diabetes, Keto og hvorfor Keto kan forbedre din diabetes

Keto kan være en kraftfuld værktøj til at forbedre blodsukkerkontrol og reducere diabetes symptomer. Her er hvad du skal vide.

## Hvordan påvirker keto diabetes?

### Blodsukkerkontrol
- **Reduceret kulhydratindtag** = lavere blodsukker
- **Stabil energi** gennem dagen
- **Færre blodsukker-crashes**

### Insulin-sensitivitet
- **Forbedret insulin-følsomhed**
- **Reduceret insulin-resistens**
- **Bedre glukose-optagelse**

## Type 2 diabetes og keto

### Fordele
- **Vægttab** reducerer insulin-resistens
- **Lavere blodsukker** gennem dagen
- **Reduceret medicinbehov** (under lægeopsyn)
- **Forbedret HbA1c** værdier

### Vigtige overvejelser
- **Konsultér din læge** før du starter
- **Monitorer blodsukker** tæt
- **Justér medicin** efter behov
- **Vær opmærksom på** hypoglykæmi

## Type 1 diabetes og keto

### Fordele
- **Stabilere blodsukker** mellem måltider
- **Reduceret insulin-behov**
- **Færre blodsukker-svingninger**
- **Bedre langtidskontrol**

### Udfordringer
- **Øget risiko for** ketoacidose
- **Kræver tæt monitoring**
- **Kompleks insulin-håndtering**
- **Behov for lægevejledning**

## Praktiske tips for diabetikere på keto

### 1. Start langsomt
- **Reducer kulhydrater gradvist**
- **Monitorer blodsukker tæt**
- **Justér medicin efter behov**

### 2. Vær forberedt
- **Ekstra blodsukker-tests**
- **Glukagon til nødstilfælde**
- **Kontakt med læge**

### 3. Fokusér på kvalitet
- **Hele, uforarbejdede fødevarer**
- **Nok fiber fra grøntsager**
- **Balanceret makro-fordeling**

## Måltider for diabetikere på keto

### Morgenmad
- **Æg med bacon og avocado**
- **Kokosnødder med nødder**
- **Bulletproof kaffe**

### Frokost
- **Laks med grøntsager**
- **Kylling med salat**
- **Ost med nødder**

### Aftensmad
- **Oksekød med broccoli**
- **Laks med spinat**
- **Kylling med avocado**

## Monitorering og tracking

### Vigtige mål
- **Blodsukker** før og efter måltider
- **HbA1c** hver 3. måned
- **Vægt** dagligt
- **Ketoner** (valgfrit)

### Apps og værktøjer
- **Blodsukker-tracker**
- **Keto-makro tracker**
- **Vægt-tracking app**

## Advarsler og forholdsregler

### Når du skal stoppe
- **Blodsukker under 3.5** mmol/L
- **Ketoacidose symptomer**
- **Alvorlige bivirkninger**

### Konsultér læge hvis
- **Blodsukker er ustabilt**
- **Du føler dig dårligt**
- **Medicin skal justeres**

## Konklusion

Keto kan være en kraftfuld værktøj til at forbedre diabetes, men kræver omhu og lægevejledning. Start langsomt, monitorer tæt, og vær realistisk om forventningerne.',
  (SELECT id FROM blog_categories WHERE slug = 'keto'),
  (SELECT id FROM auth.users LIMIT 1),
  'Diabetes, Keto og hvorfor Keto kan forbedre din diabetes',
  'Lær hvordan keto kan forbedre blodsukkerkontrol og reducere diabetes symptomer. Praktiske tips for diabetikere på keto.',
  ARRAY['keto', 'diabetes', 'blodsukker', 'insulin', 'sundhed'],
  'published',
  false,
  NOW(),
  0,
  0
),

(
  'Hvad er forskellen på LCHF og Keto?',
  'hvad-er-forskellen-paa-lchf-og-keto',
  'LCHF og keto er begge lav-kulhydrat diæter, men der er vigtige forskelle. Lær forskellen og find ud af hvilken der passer til dig.',
  '# Hvad er forskellen på LCHF og Keto?

LCHF og keto er begge lav-kulhydrat diæter, men der er vigtige forskelle. Her er hvad du skal vide.

## Hvad er LCHF?

**LCHF** står for **Lav-Kulhydrat, Høj-Fedt** og er en dansk udgave af lav-kulhydrat diæten.

### LCHF karakteristika:
- **Kulhydrater:** 50-100g om dagen
- **Fedt:** 60-70% af kalorier
- **Protein:** 20-30% af kalorier
- **Mål:** Vægttab og sundhed

## Hvad er Keto?

**Keto** står for **Ketogen** og er en mere restriktiv lav-kulhydrat diæt.

### Keto karakteristika:
- **Kulhydrater:** Under 20g netto om dagen
- **Fedt:** 70-80% af kalorier
- **Protein:** 20-25% af kalorier
- **Mål:** Ketose og vægttab

## Hovedforskelle

### 1. Kulhydratbegrænsning
- **LCHF:** 50-100g kulhydrater
- **Keto:** Under 20g netto kulhydrater

### 2. Ketose
- **LCHF:** Ikke nødvendigvis i ketose
- **Keto:** Målrettet ketose

### 3. Fleksibilitet
- **LCHF:** Mere fleksibel
- **Keto:** Mere restriktiv

### 4. Fødevarer
- **LCHF:** Flere grøntsager og frugt
- **Keto:** Fokus på fedt og protein

## Hvem skal vælge hvad?

### Vælg LCHF hvis:
- Du vil have mere fleksibilitet
- Du har svært ved at holde under 20g kulhydrater
- Du vil have flere grøntsager
- Du er nybegynder til lav-kulhydrat

### Vælg Keto hvis:
- Du vil have maksimalt vægttab
- Du kan holde under 20g kulhydrater
- Du vil have stabil energi
- Du har prøvet LCHF uden succes

## Praktiske eksempler

### LCHF måltid:
- **Kylling med ris** (ca. 30g kulhydrater)
- **Salat med dressing**
- **Avocado**

### Keto måltid:
- **Kylling med broccoli** (ca. 5g kulhydrater)
- **Salat med olivenolie**
- **Avocado og ost**

## Overgang fra LCHF til Keto

Hvis du vil gå fra LCHF til keto:
1. **Reducer kulhydrater gradvist**
2. **Øg fedtindtaget**
3. **Monitorer ketoner**
4. **Vær tålmodig med tilpasning**

## Konklusion

Både LCHF og keto kan være effektive til vægttab og sundhed. Vælg den der passer til din livsstil og mål. Du kan altid starte med LCHF og gå over til keto senere.',
  (SELECT id FROM blog_categories WHERE slug = 'lchf'),
  (SELECT id FROM auth.users LIMIT 1),
  'Hvad er forskellen på LCHF og Keto?',
  'Lær forskellen mellem LCHF og keto diæter. Find ud af hvilken der passer til dig og dine mål.',
  ARRAY['lchf', 'keto', 'lav-kulhydrat', 'sammenligning', 'diæt'],
  'published',
  false,
  NOW(),
  0,
  0
);

-- Update view counts based on Ketoliv data
UPDATE blog_posts SET view_count = 46500 WHERE slug = 'begynderguide-til-keto';
UPDATE blog_posts SET view_count = 13874 WHERE slug = 'traening-paa-keto';
UPDATE blog_posts SET view_count = 13898 WHERE slug = '8-faldgruber-paa-vej-til-ketose';
