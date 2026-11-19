<?php
declare(strict_types=1);

final class GuidesController
{
    /** Módulo 3 – Guia de desembarque nos principais aeroportos (GRU, GIG, BSB, CNF) e comparador Ônibus vs Avião */
    public static function arrival(Request $req): JsonResponse
    {
        $lang = supported_lang($req->query('lang'));

        $data = [
            'updated_at' => '2026-11-01',
            'disclaimer' => [
                'en' => 'Airport rates, transit lines and operational dynamics are subject to change. Always verify official terminal signs.',
                'es' => 'Las tarifas, líneas de transporte y dinámicas operativas están sujetas a cambios. Verifique siempre la señalización del aeropuerto.',
                'pt' => 'Tarifas, linhas de transporte e dinâmicas operacionais estão sujeitas a alterações. Sempre confira a sinalização oficial.',
            ][$lang],
            'airports' => [
                [
                    'code' => 'GRU',
                    'name' => 'São Paulo / Guarulhos (Governador André Franco Montoro)',
                    'city' => 'São Paulo, SP',
                    'terminals' => 'Terminais 1, 2 e 3 (Internacional no T3 e parte do T2)',
                    'steps' => [
                        'immigration' => [
                            'title' => ['en' => 'Immigration & Customs', 'es' => 'Migración y Aduana', 'pt' => 'Imigração e Alfândega'][$lang],
                            'desc' => ['en' => 'Follow signs for "Passaportes Estrangeiros / Foreign Passports". Prepare passport, return ticket and accommodation proof.',
                                       'es' => 'Siga las señales de "Passaportes Estrangeiros". Tenga a mano pasaporte, pasaje de regreso y comprobante de hospedaje.',
                                       'pt' => 'Siga para a fila de passaportes estrangeiros. Tenha em mãos passaporte, passagem de volta e comprovante de estadia.'][$lang],
                        ],
                        'sim_and_cash' => [
                            'title' => ['en' => 'SIM Card & Cash', 'es' => 'Chip (SIM) y Efectivo', 'pt' => 'Chip de Celular e Câmbio'][$lang],
                            'desc' => ['en' => 'Avoid exchanging large sums at airport exchange kiosks (high spreads). Exchange only 50-100 USD/EUR for initial transit. Banco do Brasil and 24h ATMs are in Terminal 3 arrivals.',
                                       'es' => 'Evite cambiar grandes montos en el aeropuerto debido a los márgenes altos. Cambie solo lo justo para el traslado. Cajeros 24h disponibles en Llegadas T3.',
                                       'pt' => 'Evite trocar grandes quantias nas casas de câmbio do aeroporto pelo spread elevado. Troque apenas o essencial. Caixas 24h disponíveis no desembarque do T3.'][$lang],
                        ],
                        'transport' => [
                            'title' => ['en' => 'Getting to São Paulo City', 'es' => 'Cómo llegar al centro de São Paulo', 'pt' => 'Como chegar à cidade de São Paulo'][$lang],
                            'options' => [
                                [
                                    'mode' => 'Ride-Hailing (Uber / 99)',
                                    'pickup' => ['en' => 'Designated app pickup zones outside Terminal 2 and Terminal 3.', 'es' => 'Puntos designados de apps en T2 y T3.', 'pt' => 'Áreas designadas de embarque de aplicativo no T2 e T3.'][$lang],
                                    'cost' => 'R$ 80 - 160 (dependendo do tráfego e destino)',
                                    'tips' => ['en' => 'Use airport free Wi-Fi to request. Do not accept unofficial passenger solicitors inside the terminal.', 'es' => 'Use el Wi-Fi del aeropuerto. No acepte ofertas de transporte informal dentro de la terminal.', 'pt' => 'Use o Wi-Fi do terminal para pedir pelo app. Nunca aceite ofertas de transporte informal abordando no saguão.'][$lang],
                                ],
                                [
                                    'mode' => 'Train / Metrô (Linha 13-Jade + Expresso Aeroporto)',
                                    'pickup' => ['en' => 'Free terminal shuttle bus to Aeroporto-Guarulhos Train Station.', 'es' => 'Autobús gratuito del aeropuerto a la estación de tren.', 'pt' => 'Ônibus circular gratuito dos terminais até a estação de trem Linha 13-Jade.'][$lang],
                                    'cost' => 'R$ 5,00',
                                    'tips' => ['en' => 'Connects to Palmeiras-Barra Funda, Luz and Brás stations. Very fast during rush hours (avoiding highway traffic).', 'es' => 'Conecta con estaciones centrales como Luz. Muy conveniente en horas pico.', 'pt' => 'Conecta às estações Luz e Barra Funda. Excelente opção para evitar os engarrafamentos da Rodovia Ayrton Senna.'][$lang],
                                ],
                                [
                                    'mode' => 'Executive Bus (EMTU Airport Bus Service)',
                                    'pickup' => ['en' => 'Curbside at Terminals 2 and 3.', 'es' => 'Paradas señalizadas en T2 y T3.', 'pt' => 'Plataformas externas nos Terminais 2 e 3.'][$lang],
                                    'cost' => 'R$ 40 - 50',
                                    'tips' => ['en' => 'Air-conditioned buses directly to Avenida Paulista, Congonhas Airport, and Praça da República.', 'es' => 'Autobuses ejecutivos con aire acondicionado a Av. Paulista y Congonhas.', 'pt' => 'Ônibus executivos com ar-condicionado direto para Av. Paulista e Aeroporto de Congonhas.'][$lang],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'code' => 'GIG',
                    'name' => 'Rio de Janeiro / Galeão (Tom Jobim)',
                    'city' => 'Rio de Janeiro, RJ',
                    'terminals' => 'Terminal 2 (concentra voos internacionais e a maioria dos domésticos)',
                    'steps' => [
                        'immigration' => [
                            'title' => ['en' => 'Arrival & Federal Police', 'es' => 'Llegada y Policía Federal', 'pt' => 'Desembarque e Polícia Federal'][$lang],
                            'desc' => ['en' => 'Terminal 2, Level 1. Keep your migration slip (if provided) safe with your passport.',
                                       'es' => 'Terminal 2, Piso 1. Conserve su comprobante migratorio junto al pasaporte.',
                                       'pt' => 'Terminal 2, Piso 1. Guarde seu comprovante de entrada com o passaporte.'][$lang],
                        ],
                        'sim_and_cash' => [
                            'title' => ['en' => 'ATMs & Connectivity', 'es' => 'Cajeros y Conectividade', 'pt' => 'Caixas Eletrônicos e Conexão'][$lang],
                            'desc' => ['en' => 'Banco 24 Horas ATMs available on the departures and arrivals mezzanine. Official airport Wi-Fi provides initial connectivity.',
                                       'es' => 'Cajeros 24h disponibles en llegadas. Conéctese a la red Wi-Fi oficial del aeropuerto.',
                                       'pt' => 'Caixas Banco 24 Horas disponíveis na área de desembarque. Use a rede Wi-Fi oficial do Galeão para pedir aplicativo.'][$lang],
                        ],
                        'transport' => [
                            'title' => ['en' => 'Getting to Zona Sul / Barra / Centro', 'es' => 'Cómo ir a Copacabana / Ipanema / Barra', 'pt' => 'Como ir para a Zona Sul / Barra / Centro'][$lang],
                            'options' => [
                                [
                                    'mode' => 'Ride-Hailing (Uber)',
                                    'pickup' => ['en' => 'Terminal 2, Departure floor (Embarque) or specific Uber Lounge pickup area.', 'es' => 'Piso superior (Salidas) o Uber Lounge señalizado.', 'pt' => 'Piso superior de Embarque ou área sinalizada Uber Lounge no T2.'][$lang],
                                    'cost' => 'R$ 60 - 120 (Copacabana/Ipanema)',
                                    'tips' => ['en' => 'Preferred and safest method. Do not accept unregulated rides offered inside the arrivals hall.', 'es' => 'El método más recomendado y seguro. Rechace taxistas informales que abordan a turistas.', 'pt' => 'Método mais recomendado e seguro. Recuse motoristas informais que abordam no desembarque.'][$lang],
                                ],
                                [
                                    'mode' => 'BRT TransCarioca + VLT / Metrô',
                                    'pickup' => ['en' => 'Station connected directly to Terminal 2.', 'es' => 'Estación conectada a la Terminal 2.', 'pt' => 'Estação do BRT integrada ao Terminal 2.'][$lang],
                                    'cost' => 'R$ 4,70',
                                    'tips' => ['en' => 'Connects to Vicente de Carvalho Metrô Line 2 or Terminal Gentileza (VLT to downtown). Only recommended if traveling light during daylight.', 'es' => 'Conecta con el metro o Terminal Gentileza. Recomendado solo con poco equipaje y de día.', 'pt' => 'Conecta ao Metrô Linha 2 ou Terminal Gentileza. Recomendável principalmente de dia e com pouca bagagem.'][$lang],
                                ],
                                [
                                    'mode' => 'Special Airport Taxis (Aerotáxi / Cooperativas)',
                                    'pickup' => ['en' => 'Official credentialed booths before the exit doors.', 'es' => 'Puestos oficiales antes de salir a la calle.', 'pt' => 'Guichês oficiais de cooperativas antes da porta de saída.'][$lang],
                                    'cost' => 'R$ 90 - 140 (preço fixo tabelado)',
                                    'tips' => ['en' => 'Fixed pre-paid price paid at the official counter by credit card. Higher price than Uber, but reliable.', 'es' => 'Tarifa fija prepagada en el mostrador. Más costoso que apps, pero formal.', 'pt' => 'Tarifa fixa paga no guichê com cartão de crédito. Mais caro que app, porém prático.'][$lang],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'code' => 'BSB',
                    'name' => 'Brasília (Presidente Juscelino Kubitschek)',
                    'city' => 'Brasília, DF',
                    'terminals' => 'Terminal 1 (Principal)',
                    'steps' => [
                        'immigration' => [
                            'title' => ['en' => 'Arrival Procedures', 'es' => 'Trámites de Llegada', 'pt' => 'Procedimentos de Chegada'][$lang],
                            'desc' => ['en' => 'Modern international wing with fast biometric and passport inspection lanes.', 'es' => 'Sector internacional moderno con filas ágiles.', 'pt' => 'Setor internacional com esteiras e controle ágil de passaporte.'][$lang],
                        ],
                        'sim_and_cash' => [
                            'title' => ['en' => 'Cash & Services', 'es' => 'Servicios y Dinero', 'pt' => 'Serviços e Câmbio'][$lang],
                            'desc' => ['en' => 'Multiple national bank branches (Banco do Brasil, Caixa) and 24h ATMs located on floor 1.', 'es' => 'Cajeros automáticos y bancos en el primer piso.', 'pt' => 'Agências do Banco do Brasil e caixas 24 Horas no piso 1.'][$lang],
                        ],
                        'transport' => [
                            'title' => ['en' => 'Getting to the Hotel Sector (Plano Piloto)', 'es' => 'Hacia el Sector Hotelero Norte/Sur', 'pt' => 'Deslocamento até os Setores Hoteleiros'][$lang],
                            'options' => [
                                [
                                    'mode' => 'Ride-Hailing (Uber / 99)',
                                    'pickup' => ['en' => 'Praça Pick-up (dedicated rideshare plaza outside the terminal).', 'es' => 'Praça Pick-up señalizada afuera de la terminal.', 'pt' => 'Praça Pick-up dedicada em frente ao terminal.'][$lang],
                                    'cost' => 'R$ 25 - 45',
                                    'tips' => ['en' => 'Very fast (15-20 min) to Setor Hoteleiro Norte or Sul via wide expressways.', 'es' => 'Muy rápido (15-20 min) hasta los hoteles centrales.', 'pt' => 'Trajeto rápido de 15 a 20 minutos até os Setores Hoteleiros Norte e Sul.'][$lang],
                                ],
                                [
                                    'mode' => 'Executive Airport Bus (Linha 113)',
                                    'pickup' => ['en' => 'Platform directly outside arrivals.', 'es' => 'Parada frente a la salida de llegadas.', 'pt' => 'Plataforma em frente ao desembarque.'][$lang],
                                    'cost' => 'R$ 12,00',
                                    'tips' => ['en' => 'Circles through both Hotel Sectors and Esplanada dos Ministérios.', 'es' => 'Recorre los sectores hoteleros y la Explanada de los Ministerios.', 'pt' => 'Passa pelos hotéis centrais e pela Esplanada dos Ministérios.'][$lang],
                                ],
                            ],
                        ],
                    ],
                ],
                [
                    'code' => 'CNF',
                    'name' => 'Belo Horizonte / Confins (Tancredo Neves)',
                    'city' => 'Belo Horizonte / Confins, MG',
                    'terminals' => 'Terminal 1 & Terminal 2 Integrados',
                    'steps' => [
                        'immigration' => [
                            'title' => ['en' => 'Arrival Overview', 'es' => 'Llegada Internacional', 'pt' => 'Chegada Internacional'][$lang],
                            'desc' => ['en' => 'Located approximately 40 km from central Belo Horizonte. Plan transport in advance.', 'es' => 'Ubicado a unos 40 km del centro de Belo Horizonte.', 'pt' => 'Localizado a 40 km do centro de Belo Horizonte. Planeje o deslocamento.'][$lang],
                        ],
                        'sim_and_cash' => [
                            'title' => ['en' => 'Terminal Amenities', 'es' => 'Cajeros y Conexión', 'pt' => 'Caixas e Wi-Fi'][$lang],
                            'desc' => ['en' => '24-hour ATMs, pharmacies and cafes available in the central concourse.', 'es' => 'Cajeros 24 horas y farmacias en el vestíbulo central.', 'pt' => 'Caixas 24h e farmácias disponíveis no saguão principal.'][$lang],
                        ],
                        'transport' => [
                            'title' => ['en' => 'Transit to Central Belo Horizonte (Savassi / Centro)', 'es' => 'Traslado a Savassi / Centro', 'pt' => 'Deslocamento até Savassi / Centro'][$lang],
                            'options' => [
                                [
                                    'mode' => 'Executive Bus (Conexão Aeroporto)',
                                    'pickup' => ['en' => 'Platform right outside main exit.', 'es' => 'Plataforma en la salida principal.', 'pt' => 'Plataforma logo na saída do desembarque.'][$lang],
                                    'cost' => 'R$ 38 - 45',
                                    'tips' => ['en' => 'Direct to Terminal Álvares Cabral (near Savassi) or Rodoviária. Punctual, safe and comfortable.', 'es' => 'Llega a Savassi y Terminal Central. Cómodo y seguro.', 'pt' => 'Direto para a Av. Álvares Cabral (Savassi) ou Rodoviária. Muito pontual e seguro.'][$lang],
                                ],
                                [
                                    'mode' => 'Ride-Hailing (Uber / 99)',
                                    'pickup' => ['en' => 'App pick-up curbside.', 'es' => 'Área de recogida de aplicaciones.', 'pt' => 'Área de embarque de aplicativos na calçada externa.'][$lang],
                                    'cost' => 'R$ 80 - 130',
                                    'tips' => ['en' => 'Takes 45-60 min to Savassi depending on traffic on Linha Verde.', 'es' => 'Toma de 45 a 60 min según el tránsito en la Linha Verde.', 'pt' => 'Tempo médio de 45 a 60 minutos dependendo do trânsito na Linha Verde.'][$lang],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'transit_comparator' => [
                'title' => ['en' => 'Intercity Travel: Flight vs Interstate Bus', 'es' => 'Viajes Interurbanos: Avión vs Autobús', 'pt' => 'Viagens Interurbanas: Avião vs Ônibus'][$lang],
                'intro' => [
                    'en' => 'Brazil has massive continental distances. Understanding when to fly and when to take comfortable sleeper buses is key to saving money and traveling efficiently.',
                    'es' => 'Brasil tiene distancias continentales. Saber cuándo tomar vuelos o autobuses cama (leito) es clave para viajar bien y ahorrar.',
                    'pt' => 'O Brasil possui dimensões continentais. Saber quando usar avião ou ônibus leito é essencial para economizar e viajar com conforto.',
                ][$lang],
                'comparison' => [
                    [
                        'route' => 'Rio de Janeiro ↔ São Paulo (~430 km)',
                        'flight' => ['desc' => '55 min (SDU ↔ CGH ponte aérea). Ideal para viagens curtas.', 'price' => 'R$ 250 - 700'],
                        'bus' => ['desc' => '6h de viagem. Ônibus "Leito" ou "Cama" noturno economiza uma noite de hotel.', 'price' => 'R$ 90 - 220'],
                        'verdict' => ['en' => 'Fly if time is critical; take night sleeper bus to save on hotel and see scenery.', 'es' => 'Avión si el tiempo es corto; autobús cama nocturno para ahorrar hospedaje.', 'pt' => 'Avião para quem tem pressa; ônibus leito noturno economiza uma diária de hotel.'][$lang],
                    ],
                    [
                        'route' => 'São Paulo ↔ Curitiba (~410 km)',
                        'flight' => ['desc' => '1h de voo.', 'price' => 'R$ 200 - 550'],
                        'bus' => ['desc' => '6h de estrada pela Régis Bittencourt.', 'price' => 'R$ 80 - 180'],
                        'verdict' => ['en' => 'Both are good options. Modern buses have Wi-Fi and reclining seats.', 'es' => 'Ambas opciones son viables y cómodas.', 'pt' => 'Ambas são boas opções. Ônibus executivos possuem poltronas reclináveis e tomadas.'][$lang],
                    ],
                    [
                        'route' => 'Sudeste ↔ Nordeste (ex.: SP ↔ Salvador, ~2.000 km)',
                        'flight' => ['desc' => '2h15 de voo direto.', 'price' => 'R$ 400 - 1.100'],
                        'bus' => ['desc' => '30h a 36h de estrada.', 'price' => 'R$ 350 - 600'],
                        'verdict' => ['en' => 'Definitely fly. Distances over 800 km in Brazil are almost always better by plane.', 'es' => 'Definitivamente avión. Para más de 800 km en Brasil, el avión compensa.', 'pt' => 'Com certeza avião. Distâncias acima de 800 km no Brasil raramente compensam de ônibus.'][$lang],
                    ],
                ],
                'official_platforms' => [
                    ['name' => 'ClickBus / QueroPassagem', 'type' => 'Passagens de ônibus interestaduais oficiais', 'url' => 'https://www.clickbus.com.br'],
                    ['name' => 'Google Voos / Skyscanner', 'type' => 'Comparação de companhias aéreas (LATAM, Gol, Azul)', 'url' => 'https://www.google.com/travel/flights'],
                ],
            ],
        ];

        return new JsonResponse($data, 200, ['Cache-Control' => 'public, max-age=600']);
    }

    /** Módulo 5 – Entrada no país, requisitos de vistos e saúde do viajante com fontes oficiais */
    public static function entryHealth(Request $req): JsonResponse
    {
        $lang = supported_lang($req->query('lang'));

        $data = [
            'updated_at' => '2026-11-01',
            'legal_disclaimer' => [
                'en' => 'Immigration and health policies can change without prior notice. This guide is advisory and does not replace official consultation with the Federal Police, Brazilian Consulates, or health professionals.',
                'es' => 'Las políticas migratorias y sanitarias pueden cambiar sin previo aviso. Esta información es orientativa y no sustituye la consulta con la Policía Federal, Consulados o autoridades de salud.',
                'pt' => 'Políticas migratórias e sanitárias podem mudar sem aviso prévio. Este guia é orientativo e não substitui a consulta aos órgãos oficiais (Polícia Federal, Consulados e Anvisa).',
            ][$lang],
            'visa_rules' => [
                [
                    'country_group' => ['en' => 'Mercosur & South America (Argentina, Chile, Uruguay, Colombia, Peru, etc.)', 'es' => 'Mercosur y Sudamérica (Argentina, Chile, Uruguay, Colombia, Perú, etc.)', 'pt' => 'Mercosul e América do Sul (Argentina, Chile, Uruguai, Colômbia, etc.)'][$lang],
                    'requirement' => ['en' => 'Visa-exempt. Can enter with national ID card (DNI/Cédula) in good condition or valid Passport.', 'es' => 'Exento de visa. Ingreso con DNI / Cédula vigente en buen estado o Pasaporte.', 'pt' => 'Isento de visto. Entrada permitida com RG/DNI ou passaporte válido.'][$lang],
                    'stay_limit' => ['en' => 'Up to 90 days (renewable at Federal Police up to 180 days per year).', 'es' => 'Hasta 90 días (renovable ante la Policía Federal hasta 180 días al año).', 'pt' => 'Até 90 dias (renovável na Polícia Federal até 180 dias por ano).'][$lang],
                    'source' => 'Polícia Federal / Itamaraty',
                    'source_url' => 'https://www.gov.br/pf/pt-br/assuntos/imigracao',
                ],
                [
                    'country_group' => ['en' => 'European Union & United Kingdom', 'es' => 'Unión Europea y Reino Unido', 'pt' => 'União Europeia e Reino Unido'][$lang],
                    'requirement' => ['en' => 'Visa-exempt for tourism with valid passport (minimum 6 months validity recommended).', 'es' => 'Exento de visa de turismo con pasaporte válido.', 'pt' => 'Isento de visto para turismo com passaporte válido.'][$lang],
                    'stay_limit' => ['en' => 'Up to 90 days per 180-day period (strict bilateral reciprocal agreements).', 'es' => 'Hasta 90 días en períodos de 180 días.', 'pt' => 'Até 90 dias a cada período de 180 dias (acordo de reciprocidade).'][$lang],
                    'source' => 'Ministério das Relações Exteriores (Itamaraty)',
                    'source_url' => 'https://www.gov.br/mre/pt-br',
                ],
                [
                    'country_group' => ['en' => 'United States, Canada, Australia', 'es' => 'Estados Unidos, Canadá, Australia', 'pt' => 'Estados Unidos, Canadá, Austrália'][$lang],
                    'requirement' => ['en' => 'Electronic Visa (eVisa) requirement reinstated by reciprocal policy. Must be requested online prior to boarding.', 'es' => 'Exigencia de eVisa electrónico por política de reciprocidad. Debe solicitarse en línea antes de abordar.', 'pt' => 'Exigência de visto eletrônico (eVisa) em vigor por reciprocidade. Deve ser emitido online antes do embarque.'][$lang],
                    'stay_limit' => ['en' => 'Up to 90 days per stay (validity varies according to issued category).', 'es' => 'Hasta 90 días por estadía.', 'pt' => 'Até 90 dias por estada.'][$lang],
                    'source' => 'Portal Oficial eVisa Brasil / VFS Global',
                    'source_url' => 'https://brazil.vfsevisa.com',
                ],
            ],
            'health_and_vaccines' => [
                'yellow_fever' => [
                    'title' => ['en' => 'Yellow Fever Vaccine (Febre Amarela)', 'es' => 'Vacuna contra la Fiebre Amarilla', 'pt' => 'Vacina de Febre Amarela'][$lang],
                    'status' => ['en' => 'Recommended at least 10 days before traveling to nature regions (Amazon, Pantanal, Chapada, Iguaçu, rural areas).', 'es' => 'Altamente recomendada al menos 10 días antes de viajar a zonas de naturaleza (Amazonía, Pantanal, Chapadas, Iguazú).', 'pt' => 'Altamente recomendada no mínimo 10 dias antes de viagens a regiões de mata e ecoturismo (Amazônia, Pantanal, Chapadas, Foz do Iguaçu).'][$lang],
                    'requirement_doc' => ['en' => 'International Certificate of Vaccination or Prophylaxis (ICVP / CIVP) issued by your national health authority.', 'es' => 'Certificado Internacional de Vacunación (CIVP).', 'pt' => 'Certificado Internacional de Vacinação (CIVP).'][$lang],
                    'source' => 'Ministério da Saúde / Anvisa',
                    'source_url' => 'https://www.gov.br/anvisa/pt-br/assuntos/viajante',
                ],
                'travel_insurance' => [
                    'title' => ['en' => 'Travel Health Insurance', 'es' => 'Seguro Médico de Viaje', 'pt' => 'Seguro Viagem'][$lang],
                    'status' => ['en' => 'Foreigners have emergency access to Brazil\'s free public health system (SUS), but private hospital coverage via travel insurance is strongly advised for comfort, speed, and repatriation.', 'es' => 'Los extranjeros tienen acceso gratuito a emergencias en el SUS, pero un seguro privado es altamente recomendado por comodidad y rapidez.', 'pt' => 'Estrangeiros têm acesso a emergências pelo SUS gratuito, mas seguro viagem privado é fortemente recomendado para atendimento ágil e repatriação.'][$lang],
                ],
                'tap_water' => [
                    'title' => ['en' => 'Drinking Water', 'es' => 'Agua Potable', 'pt' => 'Água Mineral / Encanada'][$lang],
                    'status' => ['en' => 'Tap water is treated in major cities, but mineral/filtered bottled water is universally preferred by locals for daily consumption.', 'es' => 'Se recomienda consumir agua mineral embotellada o filtrada.', 'pt' => 'Prefira água mineral engarrafada ou filtrada no dia a dia.'][$lang],
                ],
            ],
            'emergency_medical_protocol' => [
                'title' => [
                    'en' => 'What to Do If You Fall Ill in Brazil (Urgency & Emergency)',
                    'es' => 'Qué Hacer si se Enferma en Brasil (Urgencia y Emergencia)',
                    'pt' => 'Passou Mal no Brasil? Atendimento de Urgência e Emergência Médica',
                ][$lang],
                'subtitle' => [
                    'en' => 'Foreign tourists have constitutional rights to medical care in Brazil. Follow these essential steps based on severity.',
                    'es' => 'Los turistas extranjeros tienen derecho garantizado a la atención médica en Brasil. Siga estos pasos según la gravedad.',
                    'pt' => 'Turistas estrangeiros têm direito garantido a atendimento médico no Brasil. Siga este passo a passo de acordo com a gravidade.',
                ][$lang],
                'steps' => [
                    [
                        'step_number' => 1,
                        'icon' => '🚑',
                        'title' => [
                            'en' => '1. Emergency Medical Care (100% Free via SUS)',
                            'es' => '1. Atención de Emergencia (100% Gratuita por el SUS)',
                            'pt' => '1. Atendimento de Emergência (100% Gratuito pelo SUS)',
                        ][$lang],
                        'badge' => 'SUS 100% Gratuito',
                        'badge_color' => 'success',
                        'items' => [
                            [
                                'channel' => 'SAMU (Ligar 192)',
                                'phone' => '192',
                                'label' => [
                                    'en' => 'Severe Life-Threatening Emergencies (Call 192)',
                                    'es' => 'Emergencias Médicas Graves (Llamar al 192)',
                                    'pt' => 'Emergências Médicas Graves (Disque 192)',
                                ][$lang],
                                'desc' => [
                                    'en' => 'In severe life-threatening situations (accidents, heart attacks, chest pain, acute respiratory distress, severe hypertension, unconsciousness, drowning), dial 192 from any phone. Free 24h ambulance with trained doctors and paramedics.',
                                    'es' => 'En casos graves con riesgo de vida (accidentes severos, problemas cardíacos, dificultad respiratoria, desmayos, ahogamientos), marque 192 desde cualquier teléfono. Gratuito y 24 horas.',
                                    'pt' => 'Em caso de emergência médica grave (risco de vida, acidentes de trânsito, problemas cardíacos/dor no peito, crises hipertensivas severas, afogamentos, convulsões), disque 192 de qualquer telefone ou celular. O atendimento móvel do SAMU é gratuito e funciona 24 horas por dia.',
                                ][$lang],
                            ],
                            [
                                'channel' => 'UPA 24h (Unidade de Pronto Atendimento)',
                                'phone' => null,
                                'label' => [
                                    'en' => 'Acute Health Problems (Walk into a UPA 24h)',
                                    'es' => 'Problemas Agudos de Salud (Acuda a una UPA 24h)',
                                    'pt' => 'Problemas Agudos de Saúde (Procure uma UPA 24h)',
                                ][$lang],
                                'desc' => [
                                    'en' => 'For acute health issues that do not pose immediate life threat but require urgent care (high persistent fever, acute food poisoning/vomiting, severe abdominal pain, sudden illness, lacerations requiring stitches). Walk into the nearest UPA 24h with your passport or photo ID.',
                                    'es' => 'Para problemas agudos que no sean de riesgo inmediato (fiebre alta, malestar repentino, dolores intensos, cortes). El turista puede acudir directamente a la UPA 24h más cercana con su pasaporte.',
                                    'pt' => 'Para problemas de saúde agudos que não sejam de risco de vida imediato (dores fortes, febre alta persistente, intoxicação alimentar com vômitos frequentes, mal-estar súbito, cortes com necessidade de pontos), o turista pode procurar uma UPA 24h (Unidade de Pronto Atendimento) com seu passaporte ou documento de identificação.',
                                ][$lang],
                            ],
                            [
                                'channel' => 'SUS (Sistema Único de Saúde)',
                                'phone' => null,
                                'label' => [
                                    'en' => 'Constitutional Free Healthcare for Everyone',
                                    'es' => 'Salud Pública Gratuita Universal',
                                    'pt' => 'Direito Legal a Atendimento Gratuito no Brasil',
                                ][$lang],
                                'desc' => [
                                    'en' => 'Brazil operates the SUS (Unified Health System), which provides comprehensive emergency medical care completely free of charge to any person on Brazilian territory, including foreign tourists, regardless of nationality or legal status. You will not receive medical bills for public emergency care.',
                                    'es' => 'Brasil cuenta con el SUS, que brinda atención médica de urgencia y emergencia gratis a cualquier persona en territorio brasileño, incluyendo extranjeros y turistas.',
                                    'pt' => 'O Brasil possui o SUS, que presta atendimento médico de urgência e emergência de graça para qualquer pessoa em território brasileiro, incluindo estrangeiros e turistas. Por lei, nenhum hospital público pode cobrar por atendimento de urgência ou estabilização.',
                                ][$lang],
                            ],
                        ],
                    ],
                    [
                        'step_number' => 2,
                        'icon' => '🏥',
                        'title' => [
                            'en' => '2. Private Hospital Network (Hospitais Privados)',
                            'es' => '2. Atención Particular (Hospitales Privados)',
                            'pt' => '2. Atendimento Particular (Hospitais Privados)',
                        ][$lang],
                        'badge' => 'Pago / Seguro',
                        'badge_color' => 'info',
                        'desc' => [
                            'en' => 'If the tourist prefers private healthcare or has conditions requiring private hospital infrastructure, they can visit a private hospital or clinic (e.g., Einstein, Sírio-Libanês, Rede D\'Or). Private care is paid directly by the patient (credit card) or covered by travel insurance.',
                            'es' => 'Si el turista prefiere o requiere atención privada, puede acudir a un hospital privado. En estos casos, la atención es de pago (tarjeta de crédito) o cubierta por su seguro de viaje.',
                            'pt' => 'Se o turista preferir ou tiver um quadro que exija rede particular (acomodações individuais, menor tempo de espera, equipes com atendimento em inglês), ele pode se dirigir a um hospital privado. Nesses casos, o atendimento é pago pelo próprio paciente (cartão de crédito) ou coberto via seguro-viagem.',
                        ][$lang],
                    ],
                    [
                        'step_number' => 3,
                        'icon' => '🛡️',
                        'title' => [
                            'en' => '3. Activating Travel Insurance (Seguro-Viagem)',
                            'es' => '3. Activar el Seguro de Viaje',
                            'pt' => '3. Acionar o Seguro-Viagem',
                        ][$lang],
                        'badge' => 'Seguradora',
                        'badge_color' => 'warning',
                        'desc' => [
                            'en' => 'If you purchased travel insurance before arriving in Brazil, call their 24/7 assistance center immediately. The insurer will direct you to an accredited private hospital or clinic and handle direct payment or instruct on reimbursement procedures. Always request and keep medical reports (laudos), prescriptions, and official tax receipts (Notas Fiscais).',
                            'es' => 'Si contrató un seguro de viaje antes de venir a Brasil, llame de inmediato al centro de atención de la aseguradora. Le indicarán hospitales o clínicas acreditadas y cómo proceder con los costos y reembolsos.',
                            'pt' => 'Se o turista contratou um seguro-viagem antes de vir ao Brasil, ele deve ligar imediatamente para a central de atendimento 24h da seguradora. A empresa indicará quais hospitais particulares ou clínicas credenciadas ele deve procurar e como proceder com os custos. Dica de ouro: guarde sempre os laudos médicos, receitas e notas fiscais para reembolso integral.',
                        ][$lang],
                    ],
                    [
                        'step_number' => 4,
                        'icon' => '🏛️',
                        'title' => [
                            'en' => '4. Contacting Your Country\'s Embassy or Consulate',
                            'es' => '4. Contactar a la Embajada o Consulado de su País',
                            'pt' => '4. Contatar a Embaixada ou Consulado do seu País',
                        ][$lang],
                        'badge' => 'Apoio Diplomático',
                        'badge_color' => 'danger',
                        'desc' => [
                            'en' => 'In severe cases (serious accidents, prolonged hospitalization, critical surgeries, or high vulnerability), the tourist or their companion should contact the embassy or consulate of their home country in Brazil for diplomatic assistance, liaison with local authorities, family communication, and emergency guidance.',
                            'es' => 'En casos de internaciones graves, accidentes serios o situaciones de gran vulnerabilidad, el turista o su acompañante debe comunicarse con la embajada o consulado de su país en Brasil para recibir orientación y asistencia diplomática.',
                            'pt' => 'Em casos de internações graves, acidentes sérios, cirurgias complexas ou situações de grande vulnerabilidade, o turista ou seu acompanhante deve entrar em contato com a embaixada ou o consulado do seu país de origem no Brasil para obter orientações, apoio consular e comunicação com familiares.',
                        ][$lang],
                    ],
                ],
            ],
        ];

        return new JsonResponse($data, 200, ['Cache-Control' => 'public, max-age=600']);
    }
}

