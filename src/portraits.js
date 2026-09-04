const portraitRows = [
  ["freud", "https://commons.wikimedia.org/wiki/File:Sigmund_Freud,_by_Max_Halberstadt_(cropped).jpg", "Max Halberstadt", "Public domain"],
  ["jung", "https://commons.wikimedia.org/wiki/File:ETH-BIB-Jung,_Carl_Gustav_(1875-1961)-Portrait-Portr_14163_(cropped).tif", "未知作者 · ETH-Bibliothek", "Public Domain Mark"],
  ["adler", "https://commons.wikimedia.org/wiki/File:AlfredAdler.jpg", "Isidoricaaa7", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0"],
  ["anna", "https://commons.wikimedia.org/wiki/File:Anna_Freud_1957.jpg", "未知作者", "CC0", "https://creativecommons.org/publicdomain/zero/1.0/"],
  ["klein", "https://commons.wikimedia.org/wiki/File:Melanie_Klein_1952.jpg", "Douglas Glass", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0"],
  ["fromm", "https://commons.wikimedia.org/wiki/File:Erich_Fromm_1974_(cropped)2.jpg", "Müller-May", "CC BY-SA 3.0 DE", "https://creativecommons.org/licenses/by-sa/3.0/de/"],
  ["horney", "https://commons.wikimedia.org/wiki/File:Karen_Horney_1938.jpg", "Wikimedia Commons contributor", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"],
  ["erikson", "https://commons.wikimedia.org/wiki/File:Erik_Erikson.jpg", "未知作者", "Public domain"],
  ["lacan", "https://commons.wikimedia.org/wiki/File:Jacques_Lacan_during_an_interview_1969.jpg", "Foto Moisio", "Public domain"],
  ["sabina", "https://commons.wikimedia.org/wiki/File:Sabina_Spielrein.jpg", "未知作者", "Public domain"],
  ["emma", "https://commons.wikimedia.org/wiki/File:Psychoanalitic_Congress_(cropped).jpg", "Franz Vältl", "Public domain"],
  ["campbell", "https://commons.wikimedia.org/wiki/File:Joseph_Campbell_at_Feathered_Pipe_Ranch,_Montana_(cropped).jpg", "Joan Halifax", "CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"],
  ["kafka", "https://commons.wikimedia.org/wiki/File:Kafka1906_cropped.jpg", "Atelier Jacobi · Sigismund Jacobi", "Public domain"],
  ["drucker", "https://commons.wikimedia.org/wiki/File:Drucker5789.jpg", "Jeff McNeill", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"],
  ["rollo", "https://commons.wikimedia.org/wiki/File:Rollo_May_USD_Alcal%C3%A1_1977.jpg", "未知摄影者", "Public domain"],
  ["yalom", "https://commons.wikimedia.org/wiki/File:Yalom.jpg", "Masangina", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"],
  ["maslow", "https://commons.wikimedia.org/wiki/File:Photo_of_Abraham_Harold_Maslow_by_William_Carter_(cropped).jpg", "William Carter", "Public domain"],
  ["rogers", "https://commons.wikimedia.org/wiki/File:Carl_Ransom_Rogers.jpg", "Didius", "CC BY 2.5", "https://creativecommons.org/licenses/by/2.5/"],
  ["goldstein", "https://commons.wikimedia.org/wiki/File:KurtGoldstein_1_(cropped).jpg", "Wikimedia Commons contributor", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"],
  ["suzuki", "https://commons.wikimedia.org/wiki/File:Daisetsu_Teitar%C5%8D_Suzuki_photographed_by_Shigeru_Tamura.jpg", "Shigeru Tamura", "Public domain"],
  ["kierkegaard", "https://commons.wikimedia.org/wiki/File:S%C3%B8ren_Kierkegaard_(1813-1855)_-_(cropped).jpg", "Det Kgl. Bibliotek", "Public domain"],
  ["marx", "https://commons.wikimedia.org/wiki/File:Karl_Marx_001_restored.jpg", "John Jabez Edwin Mayall", "Public domain"],
  ["arendt", "https://commons.wikimedia.org/wiki/File:Hannah_Arendt_1975_(cropped).jpg", "未知作者", "Public domain"],
  ["heidegger", "https://commons.wikimedia.org/wiki/File:Heidegger_2_(1960).jpg", "Willy Pragher", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"],
  ["sartre", "https://commons.wikimedia.org/wiki/File:Jean_Paul_Sartre_1967.jpg", "T1980", "CC BY 3.0", "https://creativecommons.org/licenses/by/3.0/"],
  ["levi", "https://commons.wikimedia.org/wiki/File:Levi-strauss_260_(cropped2).jpg", "UNESCO · Michel Ravassard", "CC BY 3.0", "https://creativecommons.org/licenses/by/3.0/"],
  ["kuhn", "https://commons.wikimedia.org/wiki/File:Thomas_Kuhn_(1977)_(cropped).jpg", "Bob Bielk", "Public domain"],
  ["lewin", "https://commons.wikimedia.org/wiki/File:Sculpture_of_Kurt_Lewin,_2011.jpg", "Pko", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"],
  ["bertalanffy", "https://commons.wikimedia.org/wiki/File:Portrait_of_Ludwig_von_Bertalanffy_in_1926.jpg", "未知摄影者", "Public domain"],
  ["piaget", "https://commons.wikimedia.org/wiki/File:Jean_Piaget_in_Ann_Arbor_(cropped).png", "University of Michigan Ensian", "Public domain"],
  ["wertheimer", "https://commons.wikimedia.org/wiki/File:Max_Werheimer_(1880-1943).jpg", "未知作者", "Public domain"],
  ["bateson", "https://commons.wikimedia.org/wiki/File:Mary_Catherine_Bateson_%26_Sergio_Manghi_at_a_conference,_2004_(cropped_-_Gregory_Bateson).jpg", "Festival della Scienza", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"],
  ["mead", "https://commons.wikimedia.org/wiki/File:Margaret_Mead_(1901-1978).jpg", "Smithsonian Institution", "No known restrictions"],
  ["benedict", "https://commons.wikimedia.org/wiki/File:Ruth_Benedict.jpg", "World Telegram staff photographer", "Public domain"],
  ["maturana", "https://commons.wikimedia.org/wiki/File:Humberto_Maturana.jpg", "Fundación PROhumana · cropped by Mdd", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"],
  ["foerster", "https://commons.wikimedia.org/wiki/File:HvF_01.jpg", "University of Illinois publicity department", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"],
  ["kandel", "https://commons.wikimedia.org/wiki/File:Eric_Kandel_by_aquaris3.jpg", "aquarius3", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"],
  ["edelman", "https://commons.wikimedia.org/wiki/File:Gerald_Edelman_(cropped).jpg", "Bernard Gotfryd", "Public domain"],
  ["tononi", "https://commons.wikimedia.org/wiki/File:Giulio_Tononi_at_NIH_PioneerAwardg_2005.jpg", "National Institutes of Health", "Public domain"],
  ["koch", "https://commons.wikimedia.org/wiki/File:ChristofKoch.jpg", "Romanpoet", "Public domain"],
  ["sporns", "https://commons.wikimedia.org/wiki/File:Olaf_Sporns.png", "Skelmpie", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"],
  ["friston", "https://academic.oup.com/nsr/article/11/5/nwae025/7571549", "Courtesy of Prof. Karl Friston · National Science Review", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/", "National Science Review"],
  ["solms", "https://commons.wikimedia.org/wiki/File:Mark_Solms_2008.jpg", "News UCT", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
  ["changeux", "https://commons.wikimedia.org/wiki/File:JPChangeux-small.jpg", "Jean-Pierre Changeux", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"],
  ["dehaene", "https://commons.wikimedia.org/wiki/File:Stanislas_Dehaene_2014.jpg", "Per Henning · NTNU", "CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"]
];

export const portraits = Object.freeze(
  Object.fromEntries(
    portraitRows.map(([id, sourcePageUrl, creator, license, licenseUrl = "", sourceLabel = "Wikimedia Commons"]) => [
      id,
      Object.freeze({
        file: `portraits/${id}.webp`,
        sourcePageUrl,
        creator,
        license,
        licenseUrl,
        sourceLabel
      })
    ])
  )
);

export function portraitAssetUrl(id) {
  const portrait = portraits[id];
  return portrait ? `${import.meta.env.BASE_URL}${portrait.file}` : "";
}
