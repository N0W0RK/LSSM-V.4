const modules = {
    appstore: {
        save: 'Tallenna',
        reset: 'Nollaa',
        noMapkit:
            'Tämä moduuli ei toimi kartta tyypin "Mapkit" kanssa, Mapkitin rajoitteiden takia.!',
        dev: 'Tämä moduuli on vielä kehitteillä. Sen aktivointi voi johtaa virheellisiin ja viallisiin toimintoihin!!',
        closeWarning: {
            title: 'Tallentamattomia muutoksia',
            text: 'Olet tehnyt muutoksia AppStoressa joita ei ole tallennettu. Peruuta ne tai tallenna ne sulkeaksesi AppStoren.',
            abort: 'Peruuta',
            saveAndExit: 'Tallenna ja Poistu',
            exit: 'Poistu tallentamatta',
        },
    },
    settings: {
        name: 'Asetukset',
        save: 'Tallenna',
        discard: 'Hylkää muutokset',
        reset: 'Nollaa',
        export: 'Viedä',
        import: 'Tuoda',
        donate: 'donate voluntarily',
        appendableList: {
            unique: {
                title: 'Päällekkäinen arvo',
                text: 'Sarakkeessa **{title}** ei saa olla päällekkäisiä arvoja. Arvo **{value}** on jo olemassa!',
                confirm: 'OK',
            },
        },
        resetWarning: {
            title: 'Nollaa asetukset',
            text: 'Haluatko todella palauttaa asetukset oletusarvoihinsa? Tätä ei voi peruuttaa!',
            close: 'Peruuta',
            total: 'Kaikki asetukset',
            module: 'Vain tästä moduulista',
        },
        resetWarningSetting: {
            title: 'Nollaa asetukset',
            text: 'Haluatko todella palauttaa tämän moduulin <b>{module}</b> asetuksen <b>{setting}</b> oletusarvoonsa?',
            close: 'Peruuta',
            reset: 'Nollaa',
        },
        closeWarning: {
            title: 'Tallentamattomia muutoksia',
            text: 'Olet tehnyt muutoksia asetuksissa joita ei ole vielä tallennettu. Palauta, hylkää tai tallenna ne sulkeaksesi asetukset.',
            abort: 'Peruuta',
            saveAndExit: 'Tallenna ja poistu',
            exit: 'Poistu tallentamatta',
        },
        changeList: {
            true: 'On',
            false: 'Off',
        },
        locationSelect: {
            location: 'Valitse sijainti',
            zoom: 'Valitse sijainti ja zoomaa',
            sync: 'Käytä nykyistä sijaintiasi',
        },
    },
} as Record<string, Record<string, unknown>>;

export default {
    modules,
    buildingCategories: {
        Paloasemat: {
            buildings: [0, 18],
            color: '#FF0000',
        },
        Ambulanssiasemat: {
            buildings: [2, 5, 20],
            color: '#ffff00',
        },
        Poliisiasemat: {
            buildings: [6, 13, 19],
            color: '#06377b',
        },
        Vesipelastus: {
            buildings: [23, 24],
            color: '#00625b',
        },
        Koulut: {
            buildings: [1, 3, 8],
            color: '#d9ae6f',
        },
        Muut: {
            buildings: [7, 4, 14],
            color: '#02a18c',
        },
    },
    vehicleCategories: {
        Pelastuslaitos: {
            vehicles: {
                Paloautot: [0, 1, 12, 13],
                Huolto: [26, 27, 28, 29, 30, 32],
                Säiliö: [6, 25, 31],
                Muut: [2, 3, 4, 7, 10, 11],
            },
            color: '#FF0000',
        },
        Ensihoito: {
            vehicles: {
                Ambulanssit: [5, 22, 23],
                Muu: [19, 20, 21, 24],
                Helikopteri: [9],
            },
            color: '#ffff00',
        },
        Poliisi: {
            vehicles: {
                Partiot: [8, 16],
                Moottoripyörät: [17],
                VATI: [15, 18],
                Helikopteri: [14],
                Liikenne: [33, 34],
                Kenttäjohto: [35],
            },
            color: '#06377b',
        },
        Vesipelastus: {
            vehicles: {
                Partioautot: [37],
                Veneet: [38, 39],
            },
            color: '#06377b',
        },
    },
    small_buildings: {
        0: 18,
        2: 20,
        6: 19,
    },
    amount: 'Määrä',
    search: 'Haku',
    mapSearch: 'Sijaintihaku',
    alliance: 'Liittouma',
    premiumNotice:
        'Tämä ominaisuus laajentaa pelin premium-ominaisuutta ja on siksi saatavilla vain pelaajille, joilla on Hätäkeskuspelin premium-tili!',
    credits: 'Krediitit',
    coins: 'Kolikot',
    close: 'Sulje',
    fullscreen: {
        expand: 'Aktivoi koko näytön tila',
        compress: 'Poista koko näytön tila käytöstä',
    },
    hideTitle: 'Show heading | Hide heading',
    vehicle: 'Autoa | Auto | Autoa',
    building: 'Rakennukset',
    station: 'Asemaa | Asema | Asemaa',
    distance: 'Etäisyys | Etäisyydet',
    vehicleType: 'Ajoneuvon tyyppi',
    noOptions: 'Valitettavasti ei vastaavia vaihtoehtoja.',
    fmsReal2Show: {
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
        6: 6,
        7: 7,
        9: 9,
    },
    pois: [
        'Puisto',
        'Järvi',
        'Sairaala',
        'Metsä',
        'Linja-autopysäkki',
        'Raitiovaunupysäkki',
        'Rautatieasema (paikallisliikenne)',
        'Rautatieasema (paikallis- ja pitkän matkan liikenne)',
        'Tavara-asema',
        'Valintamyymälä (pieni)',
        'Valintamyymälä (iso)',
        'Huoltoasema',
        'Koulu',
        'Museo',
        'Ostoskeskus',
        'Autokorjaamo',
        'Moottoritien poistumisliittymä',
        'Joulumarkkinat',
        'Varastorakennus',
        'Disko',
        'Stadion',
        'Maatila',
        'Toimistorakennus',
        'Uima-allas',
        'Tasoristeys',
        'Teatteri',
        'Messukenttä',
        'Joki',
        'Pieni lentoasema (kiitorata)',
        'Suuri lentokenttä (kiitorata)',
        'Lentokenttäterminaali',
        'Pankki',
        'Varasto',
        'Silta',
        'Pikaruokaravintola',
        'Rahtisatama',
        'Kierrätyskeskus',
        'Pilvenpiirtäjä',
        'Risteilyaluslaituri',
        'Venesatama',
        'Vartioimaton tasoristeys',
        'Tunneli',
        'Kylmävarasto',
        'Voimalaitos',
        'Tehdas',
        'Romuttamo',
        'Metroasema',
        'Pieni kemikaalisäiliö',
        'Iso kemikaalisäiliö',
        'Hotelli',
        'Baari',
        'Kaatopaikka',
        'Pysäköintihalli',
        'Siilo',
        'Liikennevaloristeys',
        'Puutyöpaja',
        'Ravintola',
        'Keskusta-alue',
        'Kukkula',
        'Laituri',
        'Uimaranta',
        'Turvetuotantoalue',
        'Pelastusharjoitusalue',
        'Juhlatila',
        'Moottoritien levähdyspaikka',
    ],
    only_alliance_missions: [57, 74, 89],
    transfer_missions: [77],
    ranks: {
        missionchief: {
            0: 'Harjoittelija',
            200: 'Pelastaja',
            10_000: 'Ylipalomies',
            100_000: 'Palotarkastaja',
            1_000_000: 'Luutnantti',
            5_000_000: 'Kapteeni',
            20_000_000: 'Asemamestari',
            50_000_000: 'Paloesimies',
            1_000_000_000: 'Aluepalopäällikkö',
            2_000_000_000: 'Pelastuspäällikkö',
            5_000_000_000: 'Pelastusjohtaja',
        },
        policechief: {
            0: 'Nuorempi konstaapeli',
            200: 'Vanhempi konstaapeli',
            10_000: 'Ylikonstaapeli',
            100_000: 'Komisario',
            1_000_000: 'Ylikomisario',
            5_000_000: 'Poliisitarkastaja',
            20_000_000: 'Apulaispoliisipäällikkö',
            50_000_000: 'Poliisiylitarkastaja',
            1_000_000_000: 'Poliisipäällikkö',
            2_000_000_000: 'Poliisijohtaja',
            5_000_000_000: 'Poliisiylijohtaja',
        },
    },
};
