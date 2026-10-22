/* =========================================================
   UNITED MATTECUP – lag
   Varje liga har en lista sorterad från svagast till starkast.
   En cup lottar fram ett lag ur varje sjättedel av listan, så att
   motståndet går från lågrankat till högrankat men blir olika varje gång.
   players: målvakt, 4 backar, 4 mittfältare, 2 anfallare.
   color/text: tröjfärg och nummerfärg på planen. Lag som spelar i rött
   har bortaställ så att de syns mot United.
   Special League: alla lag i Allsvenskan 2026 (sorterade efter tabellen 11 okt)
   plus klubbar runt om i världen. Lag med swe:true räknas som svenska –
   varje cup i Special League får ett svenskt lag (ibland två, se SWE_TWO_CHANCE).
   World Cup: landslag från hela världen, sorterade grovt efter världsrankingen.
   Trupper från oktober 2026 (starting11.com). Landslagens trupper är inte
   kontrollerade mot en källa. Ändra fritt.
   ========================================================= */
'use strict';
const TEAMS = {
  PL: [
    { name:'Coventry City', short:'COV', color:'#6cc5f0', text:'#0a1f44', players:[[19,'Rushworth'],[27,'van Ewijk'],[4,'Thomas'],[2,'Pinnock'],[3,'Dasilva'],[6,'Grimes'],[8,'Yirenkyi'],[5,'Rudoni'],[10,'Mason-Clark'],[14,'Awoniyi'],[17,'Tchaouna']] },
    { name:'Hull City', short:'HUL', color:'#f5a12d', text:'#111111', players:[[19,'Tzolakis'],[2,'Coyle'],[15,'Egan'],[6,'Ajayi'],[3,'Giles'],[27,'Slater'],[25,'Crooks'],[21,'Stroud'],[29,'Gourna-Douath'],[9,'McBurnie'],[10,'Belloumi']] },
    { name:'Ipswich Town', short:'IPS', color:'#1e4b9b', text:'#ffffff', players:[[37,'Scherpen'],[26,"O'Shea"],[3,'Davis'],[6,'Diop'],[24,'Greaves'],[23,'Lukić'],[10,'Enciso'],[32,'Núñez'],[38,'Maeda'],[19,'Emersonn'],[20,'McAteer']] },
    { name:'Sunderland', short:'SUN', color:'#222222', text:'#ffffff', players:[[22,'Roefs'],[20,'Mukiele'],[4,'Danso'],[17,'Reinildo'],[32,'Hume'],[34,'Xhaka'],[27,'Sadiki'],[28,'Le Fée'],[10,'Angulo'],[18,'Isidor'],[39,'Fofana']] },
    { name:'Leeds United', short:'LEE', color:'#f4f4f4', text:'#1d428a', players:[[1,'Trafford'],[24,'Justin'],[5,'Muharemović'],[30,'Elvedi'],[15,'Bijol'],[2,'Bogle'],[4,'Ampadu'],[22,'Tanaka'],[3,'Gudmundsson'],[9,'Calvert-Lewin'],[18,'Stach']] },
    { name:'Fulham', short:'FUL', color:'#f4f4f4', text:'#111111', players:[[1,'Leno'],[21,'Castagne'],[5,'Andersen'],[3,'Bassey'],[33,'Robinson'],[16,'Berge'],[17,'Iwobi'],[14,'Bobb'],[24,'King'],[7,'García'],[9,'Muniz']] },
    { name:'Bournemouth', short:'BOU', color:'#1b1b1b', text:'#ffffff', players:[[1,'Petrović'],[3,'Truffert'],[5,'Hill'],[14,'Silva'],[15,'Smith'],[4,'Cook'],[12,'Adams'],[16,'Tavernier'],[37,'Rayan'],[9,'Evanilson'],[11,'Doak']] },
    { name:'Everton', short:'EVE', color:'#003399', text:'#ffffff', players:[[1,'Pickford'],[2,'Maitland-Niles'],[4,'Branthwaite'],[6,'Tarkowski'],[16,'Mykolenko'],[8,'Dewsbury-Hall'],[10,'Grealish'],[37,'Garner'],[45,'Armstrong'],[11,'Barry'],[19,'George']] },
    { name:'Crystal Palace', short:'CRY', color:'#1b458f', text:'#ffffff', players:[[44,'Benítez'],[26,'Richards'],[6,'Canvot'],[21,'Ahanor'],[30,'Mingueza'],[20,'Wharton'],[3,'Mitchell'],[23,'Timber'],[25,'Khalaili'],[10,'Pino'],[22,'Larsen']] },
    { name:'Nottingham Forest', short:'NFO', color:'#f4f4f4', text:'#c8102e', players:[[26,'Sels'],[34,'Aina'],[5,'Murillo'],[23,'Jair'],[3,'Williams'],[24,'McAtee'],[21,'Schlager'],[27,'Muñoz'],[2,'Diomande'],[10,'Gibbs-White'],[14,'Ndoye']] },
    { name:'Brentford', short:'BRE', color:'#f4f4f4', text:'#e30613', players:[[1,'Kelleher'],[33,'Kayode'],[20,'Ajer'],[44,'Schuster'],[2,'Hickey'],[23,'Lewis-Potter'],[27,'Janelt'],[18,'Sangaré'],[19,'Anthony'],[9,'Thiago'],[11,'Ouattara']] },
    { name:'Brighton', short:'BHA', color:'#0057b8', text:'#ffffff', players:[[1,'Verbruggen'],[29,'De Cuyper'],[5,'Dunk'],[21,'Boscagli'],[24,'Kadıoğlu'],[13,'Groß'],[25,'Gómez'],[26,'Ayari'],[44,'Vušković'],[10,'Rutter'],[19,'Kostoulas']] },
    { name:'Tottenham', short:'TOT', color:'#f2f4f8', text:'#132257', players:[[31,'Kinský'],[23,'Porro'],[37,'van de Ven'],[6,'van Hecke'],[13,'Udogie'],[30,'Bentancur'],[16,'Tonali'],[10,'Maddison'],[20,'Kudus'],[7,'Simons'],[19,'Solanke']] },
    { name:'Aston Villa', short:'AVL', color:'#7a1e3e', text:'#ffffff', players:[[1,'Suzuki'],[2,'Cash'],[3,'Lindelöf'],[5,'Mings'],[22,'Maatsen'],[7,'McGinn'],[8,'Kamara'],[24,'Onana'],[10,'Buendía'],[11,'Jackson'],[17,'Garnacho']] },
    { name:'Newcastle United', short:'NEW', color:'#1b1b1b', text:'#ffffff', players:[[21,'Horníček'],[37,'Dedić'],[4,'Botman'],[12,'Thiaw'],[3,'Hall'],[28,'Willock'],[23,'Murphy'],[11,'Barnes'],[9,'Wissa'],[10,'Osula'],[20,'Fernandez-Pardo']] },
    { name:'Chelsea', short:'CHE', color:'#034694', text:'#ffffff', players:[[1,'Martínez'],[24,'James'],[3,'Fofana'],[6,'Colwill'],[27,'Gusto'],[25,'Caicedo'],[45,'Lavia'],[7,'Neto'],[41,'Estêvão'],[10,'Palmer'],[9,'Pedro']] },
    { name:'Liverpool', short:'LIV', color:'#00a398', text:'#ffffff', players:[[1,'Alisson'],[30,'Frimpong'],[4,'van Dijk'],[5,'Jacquet'],[6,'Kerkez'],[8,'Szoboszlai'],[38,'Gravenberch'],[10,'Mac Allister'],[7,'Wirtz'],[9,'Isak'],[22,'Ekitike']] },
    { name:'Arsenal', short:'ARS', color:'#f5d000', text:'#0b2a5b', players:[[1,'Raya'],[4,'White'],[2,'Saliba'],[6,'Gabriel'],[33,'Calafiori'],[7,'Saka'],[41,'Rice'],[36,'Zubimendi'],[8,'Ødegaard'],[10,'Eze'],[14,'Gyökeres']] },
    { name:'Manchester City', short:'MCI', color:'#6cabdd', text:'#1c2c5b', players:[[1,'Donnarumma'],[45,'Khusanov'],[3,'Dias'],[6,'Guéhi'],[24,'Gvardiol'],[47,'Foden'],[5,'Anderson'],[10,'Cherki'],[11,'Doku'],[9,'Haaland'],[42,'Semenyo']] },
  ],
  CL: [
    { name:'Viking', short:'VIK', color:'#0b3d91', text:'#ffffff', players:[[1,'Østbø'],[6,'Stensness'],[5,'Heggheim'],[28,'Haugen'],[25,'Falchener'],[8,'Bell'],[10,'Tripić'],[16,'Bjørdal'],[29,'Moi'],[20,'Christiansen'],[22,'Botheim']] },
    { name:'Bodø/Glimt', short:'BOD', color:'#ffe100', text:'#111111', players:[[12,'Haikin'],[20,'Sjøvold'],[4,'Bjørtuft'],[2,'Nielsen'],[15,'Bjørkan'],[7,'Berg'],[8,'Auklend'],[10,'Hauge'],[19,'Fet'],[11,'Blomberg'],[21,'Helmersen']] },
    { name:'Slavia Prag', short:'SLA', color:'#f4f4f4', text:'#d6001c', players:[[35,'Markovič'],[3,'Holeš'],[4,'Zima'],[27,'Vlček'],[42,'Konečný'],[14,'Isife'],[16,'Moses'],[23,'Sadílek'],[30,'Nowak'],[20,'Ayaosi'],[25,'Chorý']] },
    { name:'Club Brugge', short:'BRU', color:'#0a3ea8', text:'#ffffff', players:[[1,'Sommer'],[64,'Sabbe'],[44,'Mechele'],[65,'Seys'],[3,'Han-Beom'],[10,'Vetlesen'],[20,'Vanaken'],[8,'Potts'],[9,'Forbs'],[7,'Tresoldi'],[67,'Diakhon']] },
    { name:'Fenerbahçe', short:'FEN', color:'#ffed00', text:'#0b1f5c', players:[[31,'Ederson'],[27,'Semedo'],[15,'Aké'],[3,'Brown'],[22,'Mercan'],[6,'Guendouzi'],[91,'Kanté'],[7,'Aktürkoğlu'],[11,'Greenwood'],[19,'Muriqi'],[9,'Lukaku']] },
    { name:'Galatasaray', short:'GAL', color:'#fdb912', text:'#a90432', players:[[1,'Çakır'],[4,'Jakobs'],[6,'Sánchez'],[53,'Yılmaz'],[42,'Bardakcı'],[8,'Sara'],[34,'Torreira'],[11,'Akgün'],[27,'Leão'],[7,'Sallai'],[45,'Osimhen']] },
    { name:'Feyenoord', short:'FEY', color:'#1b1b1b', text:'#ffffff', players:[[1,'Ernst'],[26,'Read'],[35,'Màrmol'],[6,'St. Juste'],[16,'López'],[8,'Zechiël'],[34,'Vanhoutte'],[28,'Targhalline'],[14,'Steijn'],[10,'Valente'],[23,'Hadj-Moussa']] },
    { name:'PSV', short:'PSV', color:'#f4f4f4', text:'#e2001a', players:[[32,'Kovář'],[2,'Geertruida'],[4,'Obispo'],[6,'Flamingo'],[8,'Dest'],[5,'Perišić'],[7,'van Bommel'],[17,'Mauro'],[20,'Til'],[9,'Pepi'],[21,'Mijnans']] },
    { name:'Porto', short:'POR', color:'#004a9f', text:'#ffffff', players:[[99,'Costa'],[20,'Baio'],[4,'Kiwior'],[5,'Bednarek'],[74,'Moura'],[10,'Veiga'],[8,'Froholdt'],[13,'Rosario'],[22,'Varela'],[11,'Aquino'],[19,'Silva']] },
    { name:'Sporting', short:'SCP', color:'#f4f4f4', text:'#008057', players:[[1,'Silva'],[22,'Fresneda'],[25,'Inácio'],[20,'Araújo'],[72,'Quaresma'],[4,'Andersen'],[5,'Altimira'],[58,'Gonçalves'],[77,'Doumbia'],[10,'Catamo'],[97,'Suárez']] },
    { name:'Napoli', short:'NAP', color:'#12a0d7', text:'#ffffff', players:[[1,'Meret'],[22,'Di Lorenzo'],[13,'Rrahmani'],[5,'Badiashile'],[17,'Olivera'],[68,'Lobotka'],[11,'De Bruyne'],[6,'Gilmour'],[16,'Marín'],[21,'Politano'],[19,'Højlund']] },
    { name:'Atlético Madrid', short:'ATM', color:'#272e61', text:'#ffffff', players:[[13,'Oblak'],[14,'Llorente'],[17,'Hancko'],[18,'Pubill'],[22,'Grimaldo'],[20,'Simeone'],[8,'Barrios'],[11,'Lookman'],[7,'Kang-In'],[15,'David'],[19,'Álvarez']] },
    { name:'Borussia Dortmund', short:'BVB', color:'#fde100', text:'#111111', players:[[1,'Kobel'],[26,'Ryerson'],[3,'Anton'],[4,'Schlotterbeck'],[5,'Bensebaïni'],[7,'Bellingham'],[8,'Nmecha'],[23,'Can'],[14,'Beier'],[20,'Sabitzer'],[9,'Guirassy']] },
    { name:'Inter', short:'INT', color:'#00539f', text:'#ffffff', players:[[1,'Martínez'],[25,'Akanji'],[6,'Stones'],[95,'Bastoni'],[32,'Dimarco'],[23,'Barella'],[20,'Çalhanoğlu'],[22,'Mkhitaryan'],[8,'Sučić'],[10,'L. Martínez'],[9,'Thuram']] },
    { name:'Paris Saint-Germain', short:'PSG', color:'#004170', text:'#ffffff', players:[[39,'Safonov'],[2,'Hakimi'],[5,'Marquinhos'],[51,'Pacho'],[25,'Mendes'],[17,'Vitinha'],[87,'Neves'],[8,'Ruiz'],[7,'Kvaratskhelia'],[14,'Doué'],[10,'Dembélé']] },
    { name:'Bayern München', short:'FCB', color:'#f4f4f4', text:'#dc052d', players:[[1,'Neuer'],[44,'Stanišić'],[2,'Upamecano'],[4,'Tah'],[19,'Davies'],[6,'Kimmich'],[45,'Pavlović'],[10,'Musiala'],[17,'Olise'],[14,'Díaz'],[9,'Kane']] },
    { name:'Barcelona', short:'BAR', color:'#004d98', text:'#ffffff', players:[[1,'García'],[23,'Koundé'],[5,'Paredes'],[15,'Christensen'],[3,'Balde'],[8,'Pedri'],[21,'de Jong'],[6,'Gavi'],[20,'Olmo'],[10,'Yamal'],[11,'Raphinha']] },
    { name:'Real Madrid', short:'RMA', color:'#f4f4f4', text:'#00529f', players:[[1,'Courtois'],[12,'Alexander-Arnold'],[22,'Rüdiger'],[4,'Huijsen'],[17,'Cucurella'],[8,'Valverde'],[14,'Tchouaméni'],[5,'Bellingham'],[15,'Güler'],[10,'Mbappé'],[7,'Vinícius']] },
  ],
  SL: [
    { name:'Halmstads BK', short:'HBK', swe:true, color:'#1a4ea2', text:'#ffffff', players:[[1,'Rönning'],[3,'Wallentin'],[5,'Gregor'],[17,'Boman'],[24,'Kaib'],[14,'Carneil'],[28,'Trybull'],[27,'Ascone'],[8,'Mäenpää'],[9,'Faraj'],[23,'Zeljkovic']] },
    { name:'Örgryte IS', short:'ÖIS', swe:true, color:'#0b2a6f', text:'#ffffff', players:[[13,'Wallinder'],[14,'Granath'],[5,'Iqbal'],[4,'Norén'],[25,'Nielsen'],[22,'Gustavsson'],[7,'Gustafson'],[6,'Enggård'],[10,'Kjær'],[18,'Bergström'],[9,'Youssef']] },
    { name:'Kalmar FF', short:'KFF', swe:true, color:'#f4f4f4', text:'#d0021b', players:[[1,'Brolin'],[2,'Larsson'],[4,'Löfgren'],[47,'Keita'],[26,'Ylitolva'],[10,'Söderbäck'],[17,'Gustafsson'],[21,'Magashy'],[23,'Gojani'],[24,'Sagoe'],[19,'Dall']] },
    { name:'Degerfors IF', short:'DEG', swe:true, color:'#f4f4f4', text:'#c8102e', players:[[38,'Igonen'],[2,'Faqa'],[3,'Skuseth'],[6,'Sundgren'],[18,'Diatara'],[8,'Hussein'],[16,'Ohlsson'],[22,'Netabay'],[13,'Hamilton'],[10,'Milleskog'],[11,'Vukojević']] },
    { name:'Mjällby AIF', short:'MAIF', swe:true, color:'#ffd100', text:'#111111', players:[[44,'Gustafsson'],[18,'Andersson'],[25,'Hammar'],[33,'Lagerlund'],[6,'Dyrestam'],[8,'Laturnus'],[14,'Paulson'],[22,'Sana'],[23,'Parker-Price'],[17,'Hofvander'],[11,'Obou']] },
    { name:'IF Brommapojkarna', short:'BP', swe:true, color:'#1b1b1b', text:'#e30613', players:[[1,'Cavallius'],[2,'Vagić'],[3,'Troelsen'],[6,'Zandén'],[11,'Örqvist'],[21,'Strand'],[27,'Barslund'],[9,'Hansen'],[17,'Kurochkin'],[20,'Odefalk'],[14,'Sever']] },
    { name:'GAIS', short:'GAIS', swe:true, color:'#111111', text:'#2ecc71', players:[[1,'Krasniqi'],[2,'de Brienne'],[4,'Ågren'],[6,'Wängberg'],[34,'Collander'],[7,'Åberg'],[8,'Milovanovic'],[25,'Lindberg'],[27,'Bawa'],[11,'Niklasson'],[32,'Pettersson']] },
    { name:'AIK', short:'AIK', swe:true, color:'#111111', text:'#ffd200', players:[[15,'Nordfeldt'],[3,'Matthys'],[17,'Thychosen'],[34,'Olofsson'],[5,'Bergquist'],[18,'Ali'],[8,'Hove'],[46,'Geiger'],[48,'Kouame'],[9,'Carlstrand'],[16,'Gustafsson']] },
    { name:'Malmö FF', short:'MFF', swe:true, color:'#7fb9e6', text:'#0b1f44', players:[[1,'Olsen'],[17,'Larsen'],[25,'Busanello'],[5,'Đurić'],[2,'Gregersen'],[37,'Skogmar'],[7,'Rosengren'],[45,'Hoog'],[47,'Lundbergh'],[32,'Guðjohnsen'],[29,'Hakšabanović']] },
    { name:'IFK Göteborg', short:'IFK', swe:true, color:'#004c99', text:'#ffffff', players:[[12,'Andersson'],[22,'Tolf'],[5,'Bager'],[18,'Eriksson'],[6,'Hermannsson'],[14,'Heintz'],[15,'Kruse'],[8,'Larsson'],[24,'Mansson'],[7,'Simmelhack'],[29,'Wiberg']] },
    { name:'Västerås SK', short:'VSK', swe:true, color:'#f4f4f4', text:'#00843d', players:[[34,'Jäger'],[2,'Magnusson'],[4,'Bonde'],[21,'Wernersson'],[24,'Tagesson'],[8,'Diagne'],[11,'Gefvert'],[15,'Karlsson'],[30,'Hellisdal'],[19,'J. Magnusson'],[17,'Taonsa']] },
    { name:'IF Elfsborg', short:'IFE', swe:true, color:'#ffe000', text:'#111111', players:[[31,'Pettersson'],[4,'Isherwood'],[6,'Wikström'],[15,'Hedlund'],[23,'Hult'],[16,'Jensen'],[18,'Magnússon'],[19,'Beck'],[29,'Kamara'],[9,'Zeneli'],[21,'Östman']] },
    { name:'BK Häcken', short:'BKH', swe:true, color:'#ffd600', text:'#111111', players:[[99,'Berisha'],[5,'Wembangomo'],[13,'Hilvenius'],[22,'Helander'],[21,'Lundkvist'],[19,'Seger'],[11,'Lindberg'],[10,'Rygaard'],[6,'Doumbia'],[20,'Svanbäck'],[9,'Lindgren']] },
    { name:'Hammarby IF', short:'HIF', swe:true, color:'#f4f4f4', text:'#00843d', players:[[1,'Hahn'],[2,'Skoglund'],[3,'Winther'],[6,'Fofana'],[16,'Persson'],[5,'Tekie'],[8,'Karlsson'],[20,'Besara'],[28,'Adjei'],[9,'Lind'],[7,'Abraham']] },
    { name:'Djurgårdens IF', short:'DIF', swe:true, color:'#5aa7de', text:'#0b1f44', players:[[35,'Rinne'],[2,'Johansson'],[4,'Une-Larsson'],[18,'Ståhl'],[24,'Larsson'],[20,'Siltanen'],[8,'Åslund'],[13,'Stensson'],[7,'Almyras'],[9,'Lien'],[16,'Hegland']] },
    { name:'IK Sirius', short:'IKS', swe:true, color:'#003a8c', text:'#ffffff', players:[[34,'Celic'],[2,'Soumah'],[4,'Anker'],[5,'Castegren'],[22,'Krusnell'],[10,'Heier'],[11,'Bjerkebo'],[24,'Svensson'],[30,'Vancsa'],[9,'Uneken'],[25,'Adindu']] },
    { name:'Vissel Kobe', short:'VIS', color:'#f4f4f4', text:'#8b0f2a', players:[[71,'Gonda'],[41,'Nagato'],[4,'Yamakawa'],[15,'Diego'],[17,'Takahashi'],[7,'Ideguchi'],[5,'Goke'],[25,'Kuwasaki'],[44,'Hidaka'],[10,'Osako'],[11,'Muto']] },
    { name:'Mamelodi Sundowns', short:'MSU', color:'#ffd200', text:'#0a7a3a', players:[[30,'Williams'],[3,'Ndamane'],[20,'Kekana'],[6,'Modiba'],[23,'Basadien'],[4,'Mokoena'],[27,'Morena'],[11,'Allende'],[17,'Matthews'],[12,'León'],[33,'Mailula']] },
    { name:'Al Ahly', short:'AHL', color:'#f4f4f4', text:'#c8102e', players:[[1,'El Shenawy'],[30,'Hany'],[2,'Marei'],[6,'Ibrahim'],[26,'El Gazar'],[13,'Attia'],[22,'Ashour'],[25,'Zizo'],[17,'Bencharki'],[9,'Benjdida'],[10,'Bakrar']] },
    { name:'Colo-Colo', short:'COL', color:'#f4f4f4', text:'#111111', players:[[12,'Villanueva'],[21,'Wiemberg'],[28,'Rojas'],[17,'Román'],[26,'Ulloa'],[8,'Madrid'],[23,'Vidal'],[6,'Alarcón'],[7,'Marchant'],[10,'Pastrán'],[9,'Correa']] },
    { name:'Seattle Sounders', short:'SEA', color:'#236192', text:'#ffffff', players:[[26,'Thomas'],[5,'Tolo'],[25,'Ragen'],[16,'Roldan'],[39,'Hawkins'],[11,'Rusnák'],[85,'Kossa-Rienzi'],[37,'Brunell'],[7,'C. Roldan'],[14,'Rothrock'],[9,'Ferreira']] },
    { name:'New York Red Bulls', short:'NYR', color:'#f4f4f4', text:'#d4002d', players:[[34,'Horvath'],[56,'Dos Santos'],[12,'Nealis'],[3,'Marshall-Rutty'],[2,'Che'],[15,'Mehmeti'],[48,'Donkor'],[10,'Forsberg'],[37,'Sofo'],[16,'Hall'],[7,'Cowell']] },
    { name:'LA Galaxy', short:'LAG', color:'#00245d', text:'#ffd200', players:[[12,'Marcinkowski'],[15,'Haak'],[5,'Glesnes'],[14,'Nelson'],[26,'Miller'],[18,'Reus'],[8,'Sanabria'],[27,'Thommy'],[22,'Wynder'],[28,'Paintsil'],[21,'Taylor']] },
    { name:'Inter Miami', short:'MIA', color:'#f7b5cd', text:'#231f20', players:[[97,'St. Clair'],[2,'Luján'],[16,'Micael'],[37,'Falcón'],[17,'Fray'],[7,'De Paul'],[8,'Segovia'],[42,'Bright'],[22,'Ayala'],[9,'Suárez'],[10,'Messi']] },
    { name:'Cruz Azul', short:'CAZ', color:'#003da5', text:'#ffffff', players:[[23,'Mier'],[3,'Campos'],[5,'Orozco'],[4,'Ditta'],[33,'Piovi'],[16,'Márquez'],[19,'Rodríguez'],[8,'Palavecino'],[20,'Paradela'],[7,'Ibáñez'],[11,'Ebere']] },
    { name:'Tigres', short:'TIG', color:'#fdb913', text:'#003a70', players:[[1,'Guzmán'],[28,'Joaquim'],[15,'Franco'],[14,'Garza'],[19,'Laínez'],[8,'Gorriarán'],[11,'Brunetta'],[16,'Lainez'],[23,'Rômulo'],[17,'Aguirre'],[77,'Herrera']] },
    { name:'Monterrey', short:'MTY', color:'#0b2a5b', text:'#ffffff', players:[[22,'Cárdenas'],[2,'Chávez'],[3,'Arteaga'],[4,'Guzmán'],[13,'Salcedo'],[8,'Torres'],[17,'Corona'],[9,'Rossi'],[10,'Orellano'],[7,'Ocampos'],[99,'Cuypers']] },
    { name:'Club América', short:'AME', color:'#ffd200', text:'#0b2c6e', players:[[30,'Cota'],[34,'Espinoza'],[29,'Juárez'],[32,'Vázquez'],[26,'Borja'],[23,'Veiga'],[28,'Sánchez'],[13,'Cervantes'],[7,'Rodríguez'],[9,'Martín'],[12,'Violante']] },
    { name:'Racing Club', short:'RAC', color:'#7ec8e3', text:'#0b1f44', players:[[25,'Cambeses'],[4,'Cannavo'],[6,'Rojo'],[3,'Di Cesare'],[19,'Rodríguez'],[10,'Miljevic'],[11,'Zaracho'],[16,'Ortegoza'],[24,'Fernández'],[9,'Martínez'],[17,'Conechny']] },
    { name:'Corinthians', short:'COR', color:'#f4f4f4', text:'#111111', players:[[1,'Souza'],[2,'Matheuzinho'],[3,'Paulista'],[13,'Henrique'],[21,'Bidu'],[7,'Breno'],[8,'Garro'],[14,'Raniele'],[49,'André'],[10,'Depay'],[18,'Raul']] },
    { name:'São Paulo', short:'SAO', color:'#f4f4f4', text:'#d71920', players:[[31,'Coronel'],[35,'Sabino'],[5,'Arboleda'],[13,'Díaz'],[18,'Wendell'],[94,'Danielzinho'],[8,'Antônio'],[16,'Bobadilla'],[19,'Ramon'],[9,'Calleri'],[17,'Silva']] },
    { name:'Boca Juniors', short:'BOC', color:'#103f79', text:'#fcc30b', players:[[1,'Montero'],[2,'Di Lollo'],[3,'Blanco'],[17,'Lozano'],[32,'Costa'],[5,'Paredes'],[10,'Aranda'],[18,'Delgado'],[25,'Ascacíbar'],[16,'Merentiel'],[20,'Velasco']] },
    { name:'River Plate', short:'RIV', color:'#f4f4f4', text:'#e30613', players:[[41,'Beltrán'],[28,'Martínez'],[29,'Montiel'],[13,'Rivero'],[21,'Acuña'],[26,'Galván'],[6,'Moreno'],[15,'Vera'],[10,'Correa'],[9,'Driussi'],[19,'Borré']] },
    { name:'Atlético Mineiro', short:'CAM', color:'#111111', text:'#ffffff', players:[[1,'Fábio'],[23,'Guga'],[22,'Freytes'],[4,'Ignacio'],[44,'Jemmes'],[8,'Martinelli'],[17,'Canobbio'],[35,'Hércules'],[32,'Acosta'],[7,'Hulk'],[11,'Savarino']] },
    { name:'Rangers', short:'RAN', color:'#1b458f', text:'#ffffff', players:[[1,'Pandur'],[37,'Fernandez'],[24,'Makhanya'],[21,'Sterling'],[29,'Penrice'],[23,'Gassama'],[6,'Neil'],[20,'Naderi'],[43,'Raskin'],[7,'Shankland'],[17,'Yokota']] },
    { name:'Celtic', short:'CEL', color:'#f4f4f4', text:'#018749', players:[[1,'Sinisalo'],[51,'Donovan'],[5,'Scales'],[6,'Trusty'],[63,'Tierney'],[8,'Nygren'],[17,'Tounekti'],[22,'Baur'],[42,'McGregor'],[9,'Høgh'],[23,'Hassan']] },
    { name:'Anderlecht', short:'AND', color:'#5b2a86', text:'#ffffff', players:[[26,'Coosemans'],[27,'Pétrot'],[79,'Maamar'],[6,'Augustinsson'],[4,'Biancone'],[55,'Kana'],[18,'Ambros'],[14,'Sikan'],[24,'Llansana'],[9,'Cvetković'],[61,'Bethume']] },
    { name:'Dinamo Zagreb', short:'DZG', color:'#0057b8', text:'#ffffff', players:[[24,'Kotarski'],[36,'Domínguez'],[26,'McKenna'],[25,'Valinčić'],[22,'Vinlöf'],[27,'Mišić'],[8,'Zajc'],[80,'Kačavenda'],[17,'Ivanušec'],[21,'Lisica'],[9,'Beljo']] },
    { name:'Red Bull Salzburg', short:'SAL', color:'#f4f4f4', text:'#d50032', players:[[52,'Zawieschitzky'],[21,'Drexler'],[44,'Boma'],[31,'Schmid'],[47,'Zabransky'],[32,'Barry'],[15,'Mazurek'],[8,'Kitano'],[11,'Vertessen'],[9,'Tabaković'],[20,'Baidoo']] },
    { name:'FC Köpenhamn', short:'FCK', color:'#f4f4f4', text:'#00205b', players:[[1,'Ramaj'],[2,'Beijmo'],[36,'Clem'],[20,'Suzuki'],[15,'López'],[6,'Markgráf'],[10,'Elyounoussi'],[16,'Robert'],[33,'Král'],[14,'Cornelius'],[39,'Dadason']] },
    { name:'Beşiktaş', short:'BJK', color:'#111111', text:'#ffffff', players:[[1,'Nübel'],[62,'Murillo'],[53,'Topçu'],[35,'Djaló'],[33,'Yılmaz'],[6,'Özcan'],[10,'Kökçü'],[15,'Olaitan'],[19,'Trossard'],[9,'Hyeon-Gyu'],[29,'Fakili']] },
    { name:'Al-Nassr', short:'NAS', color:'#fce300', text:'#1e3a8a', players:[[24,'Bento'],[12,'Boushal'],[3,'Simakan'],[26,'Martínez'],[5,'Al Amri'],[10,'Mané'],[11,'Costa'],[20,'Ângelo'],[21,'Coman'],[79,'Félix'],[7,'Ronaldo']] },
    { name:'Palmeiras', short:'PAL', color:'#f4f4f4', text:'#006437', players:[[1,'Miguel'],[12,'Khellven'],[2,'Barboza'],[56,'Arthur'],[26,'Murilo'],[17,'Freitas'],[8,'A. Pereira'],[22,'Piquerez'],[18,'Maurício'],[42,'López'],[11,'Arias']] },
    { name:'Flamengo', short:'FLA', color:'#1b1b1b', text:'#ff3b30', players:[[1,'Rossi'],[22,'Royal'],[4,'Pereira'],[13,'Danilo'],[26,'Sandro'],[5,'Pulgar'],[21,'Jorginho'],[15,'Carrascal'],[16,'Lino'],[9,'Pedro'],[19,'Plata']] },
    { name:'Ajax', short:'AJA', color:'#0b1f3a', text:'#ffffff', players:[[1,'ter Stegen'],[2,'Rosa'],[5,'Wijndal'],[6,'Kehrer'],[15,'Baas'],[4,'Amrabat'],[8,'Brandt'],[18,'Klaassen'],[24,'Mokio'],[10,'Gloukh'],[99,'Arokodare']] },
    { name:'Benfica', short:'BEN', color:'#1b1b1b', text:'#ffffff', players:[[24,'Soares'],[6,'Bah'],[44,'Araújo'],[2,'Lenglet'],[26,'Dahl'],[10,'Sudakov'],[18,'Barreiro'],[25,'Prestianni'],[27,'Rafa'],[14,'Pavlidis'],[11,'Lukebakio']] },
    { name:'Juventus', short:'JUV', color:'#f4f4f4', text:'#111111', players:[[25,'Vicario'],[15,'Kalulu'],[3,'Bremer'],[26,'Lucumí'],[2,'Çelik'],[12,'Luiz'],[7,'Conceição'],[22,'McKennie'],[31,'González'],[9,'Muani'],[17,'Alajbegović']] },
    { name:'AC Milan', short:'MIL', color:'#f4f4f4', text:'#c8102e', players:[[16,'Maignan'],[31,'Pavlović'],[34,'Gila'],[5,'De Winter'],[2,'Estupiñán'],[14,'Modrić'],[12,'Rabiot'],[80,'Musah'],[21,'Chukwueze'],[11,'Pulišić'],[9,'Ramos']] },
  ],
  WC: [
    { name:'Nya Zeeland', short:'NZL', color:'#f4f4f4', text:'#111111', players:[[1,'Crocombe'],[2,'Payne'],[5,'Boxall'],[15,'Bindon'],[13,'Cacace'],[6,'Bell'],[8,'Stamenić'],[17,'Garbett'],[10,'Singh'],[9,'Wood'],[11,'Just']] },
    { name:'Island', short:'ISL', color:'#02529c', text:'#ffffff', players:[[1,'Valdimarsson'],[2,'Pálsson'],[6,'Ingason'],[4,'Grétarsson'],[3,'Lunddal'],[8,'Jóhannesson'],[16,'Þórðarson'],[10,'Haraldsson'],[11,'Guðmundsson'],[9,'Óskarsson'],[22,'Guðjohnsen']] },
    { name:'Ghana', short:'GHA', color:'#f4f4f4', text:'#006b3f', players:[[16,'Ati-Zigi'],[2,'Seidu'],[23,'Djiku'],[4,'Salisu'],[14,'Mensah'],[6,'Samed'],[21,'Ashimeru'],[20,'Kudus'],[11,'Sulemana'],[9,'Williams'],[10,'Semenyo']] },
    { name:'Egypten', short:'EGY', color:'#1b1b1b', text:'#ffffff', players:[[1,'El Shenawy'],[3,'Hany'],[6,'Abdelmonem'],[4,'Rabia'],[13,'Fatouh'],[8,'Ashour'],[17,'Attia'],[19,'Fathy'],[14,'Trézéguet'],[10,'Salah'],[22,'Marmoush']] },
    { name:'Elfenbenskusten', short:'CIV', color:'#f77f00', text:'#0b3d20', players:[[1,'Fofana'],[17,'Singo'],[21,'Ndicka'],[7,'Kossounou'],[3,'Konan'],[6,'Sangaré'],[8,'Kessié'],[15,'Diallo'],[11,'Adingra'],[22,'Haller'],[9,'Guessand']] },
    { name:'Sverige', short:'SWE', color:'#ffcd00', text:'#005293', players:[[1,'Johansson'],[2,'Holm'],[4,'Lindelöf'],[3,'Hien'],[6,'Gudmundsson'],[8,'Ayari'],[20,'Bergvall'],[7,'Elanga'],[10,'Kulusevski'],[9,'Isak'],[17,'Gyökeres']] },
    { name:'Nigeria', short:'NGA', color:'#008751', text:'#ffffff', players:[[23,'Nwabali'],[2,'Osayi-Samuel'],[6,'Bassey'],[21,'Ajayi'],[3,'Sanusi'],[4,'Ndidi'],[8,'Onyeka'],[17,'Iwobi'],[11,'Lookman'],[9,'Osimhen'],[7,'Boniface']] },
    { name:'Kanada', short:'CAN', color:'#f4f4f4', text:'#d52b1e', players:[[1,'St. Clair'],[2,'Johnston'],[13,'Cornelius'],[15,'Bombito'],[19,'Davies'],[7,'Eustáquio'],[8,'Koné'],[11,'Buchanan'],[10,'Ahmed'],[20,'David'],[17,'Larin']] },
    { name:'Australien', short:'AUS', color:'#ffc72c', text:'#00843d', players:[[1,'Ryan'],[2,'Atkinson'],[19,'Souttar'],[4,'Circati'],[5,'Bos'],[22,'Irvine'],[13,"O'Neill"],[8,'Metcalfe'],[23,'Goodwin'],[9,'Yengi'],[11,'Irankunda']] },
    { name:'Sydkorea', short:'KOR', color:'#1b1b1b', text:'#e8384f', players:[[21,'Hyeon-Woo'],[22,'Young-Woo'],[4,'Min-Jae'],[15,'Yu-Min'],[13,'Myung-Jae'],[6,'In-Beom'],[10,'Jae-Sung'],[18,'Kang-In'],[11,'Hee-Chan'],[7,'Son'],[9,'Hyeon-Gyu']] },
    { name:'Norge', short:'NOR', color:'#f4f4f4', text:'#0b2a5b', players:[[1,'Nyland'],[2,'Ryerson'],[3,'Ajer'],[4,'Heggem'],[5,'Wolfe'],[6,'Berge'],[8,'Berg'],[10,'Ødegaard'],[7,'Nusa'],[9,'Haaland'],[20,'Sørloth']] },
    { name:'Senegal', short:'SEN', color:'#f4f4f4', text:'#00853f', players:[[16,'Mendy'],[15,'Diatta'],[3,'Koulibaly'],[19,'Niakhaté'],[14,'Jakobs'],[5,'Gueye'],[8,'Camara'],[17,'Sarr'],[10,'Mané'],[11,'Jackson'],[13,'Ndiaye']] },
    { name:'Danmark', short:'DEN', color:'#f4f4f4', text:'#c8102e', players:[[1,'Hermansen'],[18,'Kristensen'],[6,'Christensen'],[3,'Andersen'],[5,'Mæhle'],[23,'Højbjerg'],[21,'Hjulmand'],[14,'Damsgaard'],[10,'Eriksen'],[9,'Højlund'],[11,'Isaksen']] },
    { name:'Schweiz', short:'SUI', color:'#f4f4f4', text:'#d52b1e', players:[[1,'Kobel'],[3,'Widmer'],[5,'Akanji'],[4,'Elvedi'],[13,'Rodríguez'],[10,'Xhaka'],[8,'Freuler'],[17,'Vargas'],[11,'Ndoye'],[7,'Embolo'],[9,'Amdouni']] },
    { name:'Japan', short:'JPN', color:'#0b2a8c', text:'#ffffff', players:[[1,'Suzuki'],[2,'Sugawara'],[4,'Itakura'],[16,'Watanabe'],[21,'Ito'],[6,'Endo'],[5,'Morita'],[20,'Kubo'],[10,'Minamino'],[18,'Ueda'],[7,'Mitoma']] },
    { name:'USA', short:'USA', color:'#f4f4f4', text:'#0a3161', players:[[1,'Turner'],[2,'Dest'],[3,'Richards'],[13,'Ream'],[5,'Robinson'],[4,'Adams'],[8,'McKennie'],[7,'Reyna'],[10,'Pulisic'],[20,'Balogun'],[9,'Pepi']] },
    { name:'Mexiko', short:'MEX', color:'#006847', text:'#ffffff', players:[[1,'Malagón'],[2,'Sánchez'],[3,'Montes'],[5,'Vásquez'],[23,'Gallardo'],[4,'Álvarez'],[24,'Chávez'],[17,'Pineda'],[10,'Vega'],[11,'Giménez'],[9,'Jiménez']] },
    { name:'Uruguay', short:'URU', color:'#5cbfeb', text:'#0b1f44', players:[[23,'Rochet'],[13,'Varela'],[4,'Araújo'],[2,'Giménez'],[17,'Olivera'],[15,'Valverde'],[5,'Ugarte'],[6,'Bentancur'],[10,'De Arrascaeta'],[19,'Núñez'],[11,'Pellistri']] },
    { name:'Colombia', short:'COL', color:'#fcd116', text:'#003893', players:[[12,'Vargas'],[21,'Muñoz'],[23,'Sánchez'],[3,'Lucumí'],[17,'Mojica'],[6,'Ríos'],[16,'Lerma'],[11,'Arias'],[10,'Rodríguez'],[7,'Díaz'],[24,'Córdoba']] },
    { name:'Kroatien', short:'CRO', color:'#1f3a68', text:'#ffffff', players:[[1,'Livaković'],[2,'Stanišić'],[6,'Šutalo'],[5,'Ćaleta-Car'],[4,'Gvardiol'],[8,'Kovačić'],[15,'Sučić'],[7,'Majer'],[10,'Modrić'],[9,'Kramarić'],[17,'Budimir']] },
    { name:'Marocko', short:'MAR', color:'#f4f4f4', text:'#006233', players:[[1,'Bounou'],[2,'Hakimi'],[5,'Aguerd'],[18,'Riad'],[3,'Mazraoui'],[4,'Amrabat'],[8,'Ounahi'],[14,'El Khannouss'],[17,'Ezzalzouli'],[10,'Díaz'],[19,'En-Nesyri']] },
    { name:'Italien', short:'ITA', color:'#0066b3', text:'#ffffff', players:[[1,'Donnarumma'],[2,'Di Lorenzo'],[23,'Bastoni'],[5,'Calafiori'],[3,'Dimarco'],[18,'Barella'],[8,'Tonali'],[7,'Frattesi'],[20,'Politano'],[9,'Retegui'],[11,'Kean']] },
    { name:'Belgien', short:'BEL', color:'#1b1b1b', text:'#fdda24', players:[[1,'Courtois'],[21,'Castagne'],[2,'Debast'],[5,'Theate'],[3,'De Cuyper'],[24,'Onana'],[8,'Tielemans'],[7,'De Bruyne'],[11,'Doku'],[9,'Openda'],[10,'Lukaku']] },
    { name:'Tyskland', short:'GER', color:'#f4f4f4', text:'#111111', players:[[1,'Baumann'],[6,'Kimmich'],[4,'Tah'],[2,'Rüdiger'],[3,'Raum'],[5,'Pavlović'],[23,'Stiller'],[17,'Wirtz'],[10,'Musiala'],[7,'Havertz'],[9,'Woltemade']] },
    { name:'Nederländerna', short:'NED', color:'#f36c21', text:'#111111', players:[[1,'Verbruggen'],[22,'Dumfries'],[4,'van Dijk'],[15,'van de Ven'],[5,'Aké'],[14,'Reijnders'],[8,'Gravenberch'],[21,'de Jong'],[7,'Simons'],[10,'Depay'],[11,'Gakpo']] },
    { name:'Portugal', short:'POR', color:'#f4f4f4', text:'#006600', players:[[1,'Costa'],[2,'Dalot'],[4,'Dias'],[14,'Inácio'],[19,'Mendes'],[23,'Vitinha'],[15,'Neves'],[8,'Fernandes'],[10,'Silva'],[7,'Ronaldo'],[17,'Leão']] },
    { name:'Brasilien', short:'BRA', color:'#fedd00', text:'#009c3b', players:[[1,'Alisson'],[2,'Wesley'],[4,'Marquinhos'],[3,'Gabriel'],[6,'Arana'],[5,'Casemiro'],[8,'Guimarães'],[20,'Paquetá'],[19,'Estêvão'],[7,'Vinícius'],[11,'Raphinha']] },
    { name:'England', short:'ENG', color:'#f4f4f4', text:'#0b1f44', players:[[1,'Pickford'],[2,'James'],[5,'Stones'],[6,'Guéhi'],[3,'Lewis-Skelly'],[4,'Rice'],[16,'Anderson'],[10,'Bellingham'],[20,'Foden'],[9,'Kane'],[7,'Saka']] },
    { name:'Argentina', short:'ARG', color:'#75aadb', text:'#111111', players:[[23,'Martínez'],[26,'Molina'],[13,'Romero'],[2,'Balerdi'],[3,'Tagliafico'],[7,'De Paul'],[24,'Fernández'],[20,'Mac Allister'],[18,'Paz'],[10,'Messi'],[9,'Álvarez']] },
    { name:'Frankrike', short:'FRA', color:'#002654', text:'#ffffff', players:[[16,'Maignan'],[5,'Koundé'],[17,'Saliba'],[4,'Upamecano'],[22,'Hernández'],[8,'Tchouaméni'],[14,'Rabiot'],[20,'Doué'],[11,'Olise'],[10,'Mbappé'],[7,'Dembélé']] },
    { name:'Spanien', short:'ESP', color:'#0b2a5b', text:'#ffd200', players:[[23,'Simón'],[2,'Porro'],[22,'Cubarsí'],[14,'Huijsen'],[24,'Cucurella'],[16,'Rodri'],[8,'Ruiz'],[20,'Pedri'],[10,'Olmo'],[19,'Yamal'],[17,'Williams']] },
  ],
};
const STAGE_NAMES = {
  PL:['Omgång 1', 'Omgång 2', 'Omgång 3', 'Kvartsfinal', 'Semifinal', 'Final'],
  CL:['Ligaspel 1', 'Ligaspel 2', 'Ligaspel 3', 'Kvartsfinal', 'Semifinal', 'Final'],
  SL:['Världsomgång 1', 'Världsomgång 2', 'Världsomgång 3', 'Kvartsfinal', 'Semifinal', 'Final'],
  WC:['Gruppspel 1', 'Gruppspel 2', 'Åttondelsfinal', 'Kvartsfinal', 'Semifinal', 'Final'],
};
const SWE_TWO_CHANCE = 0.15; // chans att en cup i Special League får två svenska lag
const BAND_TEXT = ['Ett lag som kämpar i botten.', 'Ett lag som kan överraska.', 'Ett stabilt lag.', 'Ett starkt lag med farliga spelare.', 'Ett topplag – var beredd!', 'Ett av de allra bästa lagen.'];
/* Lottar sex motståndare: en från varje sjättedel av den rankade listan. */
function drawCup(leagueId){
  const all = TEAMS[leagueId], out = [];
  // Special League: lotta bland världsklubbarna och sätt sedan in svenska lag.
  const pool = leagueId === 'SL' ? all.filter(t => !t.swe) : all, n = pool.length;
  for (let b = 0; b < 6; b++){
    const lo = Math.floor(b * n / 6), hi = Math.floor((b + 1) * n / 6) - 1;
    out.push(pool[lo + Math.floor(Math.random() * (hi - lo + 1))]);
  }
  if (leagueId === 'SL'){
    const swe = all.filter(t => t.swe);
    if (swe.length){
      // Ett svenskt lag i varje cup, ibland två. Starkare svenska lag hamnar i en senare av de tre första omgångarna.
      const count = Math.random() < SWE_TWO_CHANCE ? 2 : 1, used = [];
      const picks = swe.map((t, i) => ({ t, band:Math.min(2, Math.floor(i * 3 / swe.length)) })).sort(() => Math.random() - .5).slice(0, count);
      picks.forEach(p => {
        let b = p.band;
        if (used.includes(b)) b = [0, 1, 2].filter(x => !used.includes(x)).sort((x, y) => Math.abs(x - p.band) - Math.abs(y - p.band))[0];
        used.push(b); out[b] = p.t;
      });
    }
  }
  return out.map((t, b) => ({ ...t, stage:STAGE_NAMES[leagueId][b], band:b, boss:b === 5, defp:.2 + Math.random() * .2,
    blurb:`${BAND_TEXT[b]} Se upp för ${t.players[9][1]} och ${t.players[10][1]}.` }));
}
if (typeof module !== 'undefined') module.exports = { TEAMS, drawCup, STAGE_NAMES };
