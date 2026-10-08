/* ───────────────────────── Sprites ───────────────────────── */

const PAL = {
  '.': null,
  'g': '#4e8f3a', 'G': '#5fa347', 'h': '#3f7a2e',
  'p': '#2f7a2f', 'P': '#45994a', 'q': '#1f5422', 't': '#5b3a1d',
  'o': '#2c7d33', 'O': '#4ea955', 'n': '#1c5a26', 'T': '#4e2f16',
  'w': '#2b5f9e', 'W': '#5a97d6', 'v': '#214b80',
  'r': '#73737d', 'R': '#9a9aa4', 's': '#4f4f58', 'S': '#eef0f6',
  'b': '#2a211d', 'B': '#392e28', 'a': '#4b413b', 'k': '#120c09',
  'e': '#d9542b', 'E': '#f5a623',
  'f': '#ff4a1c', 'F': '#ffa726', 'y': '#ffe866', 'x': '#ffffff',
  // town
  'c': '#e8d9b5', 'C': '#c9b892', 'd': '#b5392c', 'D': '#7d2419',
  'u': '#3d5a8a', 'U': '#26395a', 'm': '#5b3a1d', 'i': '#ffe9a8',
  'z': '#8a6a3e', 'Z': '#6b4f2c', 'l': '#5a5a62', 'L': '#7a7a84', 'K': '#111111',
  // people & vehicles
  'j': '#f2c94c', 'J': '#e0a080', 'Y': '#c9a227', 'N': '#30405e',
  // big pine
  'A': '#1a4a22', 'Q': '#2a6a30', 'M': '#3d8a3a',
  // road
  '1': '#6e6a62', '2': '#56534c', '3': '#8a857a',
  // wagon
  'V': '#7a4e22', 'H': '#f3eee0',
  // civic
  '4': '#8b8b93', '5': '#5c5c64', '6': '#c9a86a', '7': '#2f2f36', '8': '#e8e0c8', '9': '#a33a2a', '0': '#3b6ea8',
  // ice
  '<': '#c4dcf0', '>': '#a3c3e3', '=': '#e6f0fb',
  // ores
  '!': '#c2602c', '@': '#2fa37a', '#': '#17171b', '$': '#b8ff2e', '&': '#f2c14e',
  // jungle greens, which no season touches
  '{': '#1e7a2e', '}': '#2f9a3f', '|': '#145a22',
};

const SPRITES = {
  ice: [
    '<<<<<<<<<<<<<<<<','<<==<<<<<<<<<<<<','<<<<<<<<<<>><<<<','<<<<<<<<<>><<<<<',
    '<<<<<<<<>><<<<<<','<<<<<<<>><<<<<<<','<<<<<<<<<<<<<<==','<<<<<<<<<<<<<<<<',
    '<<<<<<<<<<<<<<<<','<==<<<<<<<<<<<<<','<<<<<<<<<<<<<<<<','<<<<<>><<<<<<<<<',
    '<<<<<<>><<<<<<<<','<<<<<<<>><<<<==<','<<<<<<<<<<<<<<<<','<<<<<<<<<<<<<<<<',
  ],
  grass0: [
    'gggggggggggggggg','ggggGgggggggggGg','gggGGgggghggggGg','ggggggggghgggggg',
    'gggggggggggggggg','gGggggggggggGggg','gGgggghgggggGggg','gggggghggggggggg',
    'ggggggggggggggGg','ggggggggGgggggGg','gghgggggGggggggg','gghggggggggggggg',
    'gggggggggggggggg','gggggGgggghggggg','gggggGgggghggggg','gggggggggggggggg',
  ],
  grass1: [
    'gggggggggggggggg','gggggggggGgggggg','gGgggggggGgggggg','gGgggggggggggggg',
    'ggggghgggggggGgg','ggggghgggggggGgg','gggggggggggggggg','ggggggggggghgggg',
    'ggGgggggggghgggg','ggGggggggggggggg','ggggggGggggggggg','ggggggGggggghggg',
    'gghggggggggggggg','gghgggggggGggggg','ggggggggggGggggg','gggggggggggggggg',
  ],
  pine: [
    'gggggggggggggggg','gggggggPgggggggg','gggggggPgggggggg','ggggggPPPggggggg',
    'ggggggpPpggggggg','gggggpPPPpgggggg','gggggqpPpqgggggg','ggggpPPPPPpggggg',
    'ggggqppPppqggggg','gggpPPPPPPPpgggg','gggqpppPpppqgggg','ggpPPPPPPPPPpggg',
    'ggqqpppPpppqqggg','gggggggtgggggggg','gggggghtthgggggg','gggggggggggggggg',
  ],
  oak: [
    'gggggOOOOOOggggg','gggOOOOOoooOOggg','ggOOOOooooooOogg','gOOOooooooooooog',
    'gOOoooooooooonng','OOoooooooooonnno','Ooooooooooonnnno','Oooooooooonnnnno',
    'Ooooooooonnnnnnn','goooooonnnnnnnng','ggooonnnnnnnnngg','gggnnnnnnnnnnggg',
    'gggggnTTTTnggggg','gggggggTTggggggg','gggggghTThgggggg','gggggggggggggggg',
  ],
  water0: [
    'wwwwwwwwwwwwwwww','wwWWwwwwwwwwwwww','wwwwwwwwwwWWWwww','wwwwwwwwwwwwwwww',
    'wvvwwwwwwwwwwwww','wwwwwwWWwwwwwwww','wwwwwwwwwwwwwvvw','wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww','wWWWwwwwwwwwwwww','wwwwwwwwwvvwwwww','wwwwwwwwwwwwwwww',
    'wwwwwWWwwwwwwwww','wwwwwwwwwwwwwWWw','wwvvwwwwwwwwwwww','wwwwwwwwwwwwwwww',
  ],
  water1: [
    'wwwwwwwwwwwwwwww','wwwWWwwwwwwwwwww','wwwwwwwwwwwWWWww','wwwwwwwwwwwwwwww',
    'wwvvwwwwwwwwwwww','wwwwwwwWWwwwwwww','wwwwwwwwwwwwvvww','wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww','wwWWWwwwwwwwwwww','wwwwwwwwwwvvwwww','wwwwwwwwwwwwwwww',
    'wwwwwwWWwwwwwwww','wwwwwwwwwwwwWWww','wvvwwwwwwwwwwwww','wwwwwwwwwwwwwwww',
  ],
  rock: [
    'gggggggggggggggg','gggggggSSggggggg','ggggggSSSSgggggg','gggggSSRRSSggggg',
    'ggggRRRRrRRRgggg','gggRRRrrrrRRRggg','gggRrrrrrrrrRggg','ggRrrrrsrrrrrRgg',
    'ggRrrrssrrrrrrRg','gRrrrsssrrrsrrRg','gRrrssssrrrssrRg','Rrrsssssrrsssrrr',
    'rrssssssssssssrr','rsssssssssssssss','ssssssssssssssss','ssssssssssssssss',
  ],
  ash: [
    'bbbbbbbbbbbbbbbb','bbBbbbbbbbbabbbb','bbbbbbbabbbbbbbb','bbbbbbbbbbbbbbbb',
    'bbbbbBbbbbbbbbbb','bbbbbbbbbbbbBbbb','babbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb',
    'bbbbbbbbabbbbbbb','bbbBbbbbbbbbbbbb','bbbbbbbbbbbBbbbb','bbbbbbbbbbbbbbbb',
    'bbbbbabbbbbbbbbb','bbbbbbbbbbbbbabb','bbBbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb',
  ],
  ashGlow: [
    'bbbbbbbbbbbbbbbb','bbBbbbbbbbbabbbb','bbbbbbbebbbbbbbb','bbbbbbbbbbbbbbbb',
    'bbbbbBbbbbbbEbbb','bbbbbbbbbbbbBbbb','bebbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb',
    'bbbbbbbbabbbbbbb','bbbBbbbbbbbbbebb','bbbbbbbbbbbBbbbb','bbbbbEbbbbbbbbbb',
    'bbbbbabbbbbbbbbb','bbbbbbbbbbbbbabb','bbBbbbbbbbebbbbb','bbbbbbbbbbbbbbbb',
  ],
  stump: [
    'bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb','bbbbbbbkbbbbbbbb','bbbbbbkkbbbbbbbb',
    'bbbbbbbkbbbbbbbb','bbbbbkbkbkbbbbbb','bbbbbbkkkbbbbbbb','bbbbbbbkbbbbbbbb',
    'bbbbbbbkkbbbbbbb','bbbbbbbkbbbbbbbb','bbbbbbkkkbbbbbbb','bbbbbbkkkbbbbbbb',
    'bbbbbkkkkkbbbbbb','bbbbbkkkkkbbbbbb','bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb',
  ],
  stumpGlow: [
    'bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb','bbbbbbbkbbbbbbbb','bbbbbbkkbbbbbbbb',
    'bbbbbbbkbbbbbbbb','bbbbbkbkbkbbbbbb','bbbbbbkkkbbbbbbb','bbbbbbbkbbbbbbbb',
    'bbbbbbbkkbbbbbbb','bbbbbbbkbbbbbbbb','bbbbbbkekbbbbbbb','bbbbbbkkkbbbbbbb',
    'bbbbbkkekkbbbbbb','bbbbbkkkkkbbbbbb','bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb',
  ],
  fire0: [
    'kkkkkkkkkkkkkkkk','kkkkkkkkkkkkkkkk','kkkkkkkkfkkkkkkk','kkkkkkkffkkkkkkk',
    'kkkkkkkffkkkfkkk','kkkkkfkfFfkkfkkk','kkkkkffFFfkffkkk','kkkkkfFFFFffffkk',
    'kkkkffFFyFFfffkk','kkkffFFyyyFFffkk','kkkffFyyyyyFFfkk','kkfffFyyyyyyFfkk',
    'kkffFFyyyyyyFffk','kfffFFyyyyyyFfff','kfffFFFyyyyFFfff','ffffFFFFFFFFffff',
  ],
  fire1: [
    'kkkkkkkkkkkkkkkk','kkkkfkkkkkkkkkkk','kkkkfkkkkkkkkkkk','kkkkffkkkkkfkkkk',
    'kkkkffkkkkffkkkk','kkkfFfkkkkffkkkk','kkkfFffkkfFffkkk','kkffFFfkffFFfkkk',
    'kkffFFFffFFFffkk','kkfFFyFFFFyFFfkk','kkfFyyyFFyyyFfkk','kffFyyyyyyyyFffk',
    'kffFyyyyyyyyFffk','fffFFyyyyyyFFfff','fffFFFyyyyFFFfff','ffffFFFFFFFFffff',
  ],
  fire2: [
    'kkkkkkkkkkkkkkkk','kkkkkkkkkkkfkkkk','kkkkkkkkkkffkkkk','kkkfkkkkkkffkkkk',
    'kkkfkkkkkfFfkkkk','kkffkkkkkfFfkkkk','kkffkkkkffFFfkkk','kkfFfkkffFFFfkkk',
    'kffFffffFFyFffkk','kffFFFfFFyyyFfkk','kffFFFFFyyyyFfkk','kffFyyFFyyyyFffk',
    'kfFFyyyyyyyyFffk','ffFFyyyyyyyyFfff','fffFFFyyyyyFFfff','ffffFFFFFFFFffff',
  ],
  birch: [
    'gggggggggggggggg','gggggGGGGGgggggg','ggggGGGGGGGggggg','gggGGGgGGGGGgggg',
    'gggGGGGGGGgGGggg','ggGGgGGGGGGGGGgg','ggGGGGGgGGGGGGgg','ggGGGGGGGGgGGGgg',
    'gggGGGgGGGGGgggg','gggGGGGGGGGGgggg','ggggGGGGGGGggggg','gggggggxxggggggg',
    'gggggggxkggggggg','gggggggkxggggggg','gggggggxxggggggg','gggggggggggggggg',
  ],
  scrub: [
    'gggggggggggggggg','gggggggggggggggg','ggZggggggggZgggg','gZzZggggggZzZggg',
    'gzzzzggggzzzzzgg','gZzzZggggZzzzZgg','gggZgggggggZgggg','gggggggggggggggg',
    'ggggggZZZggggggg','gggggZzzzZgggggg','ggggZzzzzzZggggg','gggggZzzzZgggggg',
    'ggggggZZZggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
  ],
  snag: [
    'gggggggggggggggg','gggggggkgggggggg','ggggggkkgggggggg','gggggggkgggggggg',
    'gggggkgkgkgggggg','ggggggkkkggggggg','gggggggkgggggggg','gggggggkkggggggg',
    'gggggggkgggggggg','ggggggkkkggggggg','ggggggkkkggggggg','gggggkkkkkgggggg',
    'gggggkkkkkgggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
  ],
  bigpine: [
    'gggggggMgggggggg','gggggggMgggggggg','ggggggQMQggggggg','ggggggAMQggggggg',
    'gggggQAMQMgggggg','gggggAQMQAgggggg','ggggQAQMQAQggggg','ggggAAQMQQAggggg',
    'gggQAAQMQQAQgggg','gggAAQQMQQQAgggg','ggQAAQQMQQQAQggg','ggAAAQQMQQQQAggg',
    'gAAAAQQMQQQQQAgg','AAAAAAQMQQQQQAAg','gggggggttggggggg','gggggghtthgggggg',
  ],
  road: [
    '1111111111111111','1121111111112111','1111111311111111','1111111111111111',
    '1211111111121111','1111113111111111','1111111111111121','1111111111111111',
    '1111111112111111','1131111111111111','1111111111111211','1111111111111111',
    '1111121111111111','1111111111311111','1211111111111111','1111111111112111',
  ],
  wagon: [
    '................','................','................','....HHHHHHHH....',
    '...HHHHHHHHHH...','...HHHHHHHHHH...','...HHHHHHHHHH...','...HHHHHHHHHH...',
    '..VVVVVVVVVVVVt.','..VVVVVVVVVVVVtt','..VVVVVVVVVVVVt.','...KK......KK...',
    '..KKKK....KKKK..','...KK......KK...','................','................',
  ],
  dragon0: [
    'K..............K','KK....EddE....KK','KDK....dd....KDK','KDDK...dd...KDDK',
    '.KDDK..dd..KDDK.','.KDDDKKddKKDDDK.','..KDDDDddDDDDK..','...KDDDDddDDDK..',
    '....KKDDddDDKK..','......KDddDK....','.......KddK.....','.......KdK......',
    '.......KdK......','........K.......','........K.......','................',
  ],
  dragon1: [
    '................','......EddE......','.......dd.......','.......dd.......',
    '.....KKddKK.....','...KKDDddDDKK...','..KDDDDddDDDDK..','.KDDDKKddKKDDDK.',
    'KDDK..KddK..KDDK','KDK...KdK...KDK.','KK....KdK.....KK','K......K......K.',
    '.......K........','........K.......','................','................',
  ],
  soldier: [
    '................','................','......llll......','.....llllll.....',
    '.....llllll.....','......JJJJ......','......JJJJ.....S','.....dddddd....S',
    '....ddddddddt..S','....ddxxxxdd.t.S','....JddddddJ..tS','.....NNNNNN...tS',
    '.....NNNNNN....t','.....NN..NN....t','.....KK..KK.....','................',
  ],
  wall: [
    'RRRRRRRRRRRRRRRR','rrrrrrrrrrrrrrrr','rrrrrrrsrrrrrrrs','srrrrrrsrrrrrrrs',
    'RRRRRRRRRRRRRRRR','rrrsrrrrrrrsrrrr','rrrsrrrrrrrsrrrr','RRRRRRRRRRRRRRRR',
    'rrrrrrrsrrrrrrrs','srrrrrrsrrrrrrrs','RRRRRRRRRRRRRRRR','rrrsrrrrrrrsrrrr',
    'rrrsrrrrrrrsrrrr','RRRRRRRRRRRRRRRR','ssssssssssssssss','kkkkkkkkkkkkkkkk',
  ],
  farm: [
    'gggggggggggggggg','g6Z6Z6Z6Z6Z6Z6Zg','gZ6Z6Z6Z6Z6Z6Z6g','g6Z6Z6Z6Z6Z6Z6Zg',
    'gggggggggggggggg','g6Z6Z6Z6Z6Z6Z6Zg','gZ6Z6Z6Z6Z6Z6Z6g','g6Z6Z6Z6Z6Z6Z6Zg',
    'gggggggggggggggg','g6Z6Z6Z6Z6Z6Z6Zg','gZ6Z6Z6Z6Z6Z6Z6g','g6Z6Z6Z6Z6Z6Z6Zg',
    'gggggggggggggggg','g6Z6Z6Z6Z6Z6Z6Zg','gZ6Z6Z6Z6Z6Z6Z6g','gggggggggggggggg',
  ],
  bridge: [
    'wwwwwwwwwwwwwwww','wwwwwwwwwwwwwwww','VVVVVVVVVVVVVVVV','mtmtmtmtmtmtmtmt',
    'tmtmtmtmtmtmtmtm','mtmtmtmtmtmtmtmt','tmtmtmtmtmtmtmtm','mtmtmtmtmtmtmtmt',
    'tmtmtmtmtmtmtmtm','mtmtmtmtmtmtmtmt','tmtmtmtmtmtmtmtm','mtmtmtmtmtmtmtmt',
    'tmtmtmtmtmtmtmtm','VVVVVVVVVVVVVVVV','wwwwwwwwwwwwwwww','wwwwwwwwwwwwwwww',
  ],
  dam: [
    'wwwwwwwwwwwwwwww','wwwwwwwwwwwwwwww','wwwwtVtVtVtwwwww','wwwVtVtVtVtVwwww',
    'wwtVtVtVtVtVtwww','wwVtVtVtVtVtVwww','wwtVtVtVtVtVtwww','wwVtVtVtVtVtVwww',
    'wwtVtVtVtVtVtwww','wwVtVtVtVtVtVwww','wwtVtVtVtVtVtwww','wwwVtVtVtVtVwwww',
    'wwwwtVtVtVtwwwww','wwwwwwwwwwwwwwww','wwwwwwwwwwwwwwww','wwwwwwwwwwwwwwww',
  ],
  mud: [
    'ZZZZZZZZZZZZZZZZ','ZZzZZZZZZZzZZZZZ','ZZZZZZwZZZZZZZZZ','ZZZZZZZZZZZZZZZZ',
    'ZzZZZZZZZZZZzZZZ','ZZZZZZZZwwZZZZZZ','ZZZZZzZZZZZZZZZZ','ZZZZZZZZZZZZZZZZ',
    'ZZZZZZZZZZZZZZZz','ZZwZZZZZZZZZZZZZ','ZZZZZZZZZZzZZZZZ','ZZZZZZZZZZZZZZZZ',
    'ZZZZzZZZZZZZZZZZ','ZZZZZZZZZZZZwwZZ','ZZZZZZZZZZZZZZZZ','ZZZZZZZZZZZZZZZZ',
  ],
  beaver: [
    '................','................','................','................',
    '................','........mm......','.......mmmm.....','......mmmmmK....',
    '.....mmmmmmm....','....VVmmmmmm....','...VVVVmmmm.....','....VV..mm......',
    '................','................','................','................',
  ],
  boat: [
    '................','................','................','.......t........',
    '.......t........','......xtx.......','.....xxtxx......','....xxxtxxx.....',
    '.......t........','..VVVVVVVVVVV...','..VVVVVVVVVVVV..','...VVVVVVVVVV...',
    '....VVVVVVVV....','................','................','................',
  ],
  fireboat: [
    '................','................','......d.........','......dd........',
    '.....dddd.......','.....dWWd.......','.....dddd.......','......KK........',
    '..ddddddddddd...','..dxxxxxxxxxxd..','..dddddddddddd..','...dddddddddd...',
    '....dddddddd....','................','................','................',
  ],
  // ── civic & military buildings ──
  tenement: [
    'gggggggggggggggg','g77777777777777g','g76666666666667g','g76i6i6i6i6i667g',
    'g76666666666667g','g76i6i6i6i6i667g','g76666666666667g','g76i6i6i6i6i667g',
    'g76666666666667g','g76i6i6i6i6i667g','g76666666666667g','g7666666mm66667g',
    'g7666666mm66667g','g77777777777777g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  barracks: [
    'gggggggggggggggg','gg9ggggggggggggg','gg9xxggggggggggg','gg9xxggggggggggg',
    'gg9ggggggggggggg','g55555555555555g','g54444444444445g','g54K4K4K4K4K445g',
    'g54444444444445g','g54K4K4K4K4K445g','g54444444444445g','g5444444mm44445g',
    'g5444444mm44445g','g55555555555555g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  forge: [
    'gggggggggggggggg','gggggg555ggggggg','gggggg5k5ggggggg','gggggg5k5ggggggg',
    'g55555555555555g','g5mmmmmmmmmmmm5g','g5mmmmmmmmmmmm5g','g5mmmFFmmmmmmm5g',
    'g5mmFyFmmmmmmm5g','g5mmmFFmmmmmmm5g','g5mmmmmmmmKKmm5g','g5mmmmmmmmKKmm5g',
    'g55555555555555g','g55555555555555g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  factory: [
    'gg555ggggg555ggg','gg5k5ggggg5k5ggg','gg5k5ggggg5k5ggg','gg5k5ggggg5k5ggg',
    'g55555555555555g','g59999999999995g','g59000900090095g','g59999999999995g',
    'g59000900090095g','g59999999999995g','g59999999999995g','g5999999mm999995g'.slice(0, 16),
    'g5999999mm99995g','g55555555555555g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  university: [
    'gggggggggggggggg','ggggggg88ggggggg','gggggg8888gggggg','ggggg888888ggggg',
    'gggg88888888gggg','g88888888888888g','g86868686868688g','g86868686868688g',
    'g86868686868688g','g86868686868688g','g86868686868688g','g8686868mm68688g',
    'g8686868mm68688g','g88888888888888g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  tower: [
    'gggggggggggggggg','ggggg9999ggggggg','gggg999999gggggg','gggg9i9i99gggggg',
    'gggg999999gggggg','ggggg4444ggggggg','ggggg4KK4ggggggg','ggggg4444ggggggg',
    'ggggg4444ggggggg','ggggg4KK4ggggggg','ggggg4444ggggggg','ggggg4444ggggggg',
    'gggg444444gggggg','gggg444444gggggg','ggggZZZZZZgggggg','gggggggggggggggg',
  ],
  silo: [
    'gggggggggggggggg','gggggggggggggggg','ggg5555555555ggg','gg555555555555gg',
    'gg554444444455gg','gg554477774455gg','gg554477774455gg','gg554477774455gg',
    'gg554477774455gg','gg554444444455gg','gg555555555555gg','ggg5555555555ggg',
    'ggggg9gggg9ggggg','ggggg9gggg9ggggg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  townhall: [
    'gggggggggggggggg','ggggggg9gggggggg','ggggggg99ggggggg','gggggg888ggggggg',
    'ggggg88888gggggg','gggg8888888ggggg','g88888888888888g','g86668666866688g',
    'g86668666866688g','g86668666866688g','g86668666866688g','g8666866mm66688g',
    'g8666866mm66688g','g88888888888888g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  // ── town ──
  house0: [
    'gggggggggggggggg','ggggggDDDDgggggg','gggggDddddDggggg','ggggDddddddDgggg',
    'gggDddddddddDggg','ggDddddddddddDgg','gDddddddddddddDg','DDDDDDDDDDDDDDDD',
    'gccccccccccccccg','gcciiiccccmmmccg','gcciiiccccmmmccg','gcciiiccccmmmccg',
    'gccccccccmmmmccg','gCCCCCCCCCCCCCCg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  house1: [
    'gggggggggggggggg','ggggggUUUUgggggg','gggggUuuuuUggggg','ggggUuuuuuuUgggg',
    'gggUuuuuuuuuUggg','ggUuuuuuuuuuuUgg','gUuuuuuuuuuuuuUg','UUUUUUUUUUUUUUUU',
    'gccccccccccccccg','gccmmmccccciiicg','gccmmmccccciiicg','gccmmmccccciiicg',
    'gcmmmmcccccccccg','gCCCCCCCCCCCCCCg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  station: [
    'gggggggggggggggg','gKKKKKKKKKKKKKKg','gKddddddddddddKg','gKddxxxxxxxxddKg',
    'gKddxdxxxxdxddKg','gKddxxxddxxxddKg','gKddxxxxxxxxddKg','gKddddddddddddKg',
    'gKdxxxxxxxxxxdKg','gKdxxxxxxxxxxdKg','gKdxxKxxxxKxxdKg','gKdxxxxxxxxxxdKg',
    'gKdxxxxxxxxxxdKg','gKKKKKKKKKKKKKKg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
  ],
  rubble: [
    'bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb','bbbbbbbbbbbabbbb','bbbaabbbbbbabbbb',
    'bbaRabbbbbbbbbbb','bbaaabbbbRabbbbb','bbbbbbbbbaaabbbb','bbbbbcabbbaabbbb',
    'bbbbaaabbbbbbbbb','bbbaaaaabbbcbbbb','bbbbbbbbbbaaabbb','bbbbRbbbbbaaabbb',
    'bbbaaabbbbbbbbbb','bbbaaaabbbbbbbbb','bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb',
  ],
  dirt: [
    'zzzzzzzzzzzzzzzz','zzZzzzzzzzzzZzzz','zzzzzzzZzzzzzzzz','zzzzzzzzzzzzzzzz',
    'zZzzzzzzzzzZzzzz','zzzzzzzzzzzzzzzz','zzzzzZzzzzzzzzZz','zzzzzzzzzzzzzzzz',
    'zzzzzzzzzZzzzzzz','zzZzzzzzzzzzzzzz','zzzzzzzzzzzzZzzz','zzzzzzZzzzzzzzzz',
    'zzzzzzzzzzzzzzzz','zZzzzzzzzzZzzzzz','zzzzzzzzzzzzzzzz','zzzzzzzZzzzzzzzz',
  ],
  pad: [
    'llllllllllllllll','lLllllllllllllLl','llllllllllllllll','llllllllllllllll',
    'llllxxxxxxxxllll','llllxxxxxxxxllll','llllllllllllllll','llllllllllllllll',
    'llllllllllllllll','llllllllllllllll','llllxxxxxxxxllll','llllxxxxxxxxllll',
    'llllllllllllllll','llllllllllllllll','lLllllllllllllLl','llllllllllllllll',
  ],
  hangar: [
    'llllllllllllllll','lRRRRRRRRRRRRRRl','lRrrrrrrrrrrrrRl','lRrrrrrrrrrrrrRl',
    'lRrrrrrrrrrrrrRl','lRrrrddddddrrrRl','lRrrrdxxxxdrrrRl','lRrrrddddddrrrRl',
    'lRrrrrrrrrrrrrRl','lRrsssssssssssRl','lRrsssssssssssRl','lRrsssssssssssRl',
    'lRrsssssssssssRl','lRRRRRRRRRRRRRRl','llllllllllllllll','llllllllllllllll',
  ],
  worker: [
    '................','................','......mmmm......','.....mJJJJm.....',
    '......JJJJ......','......JJJJ......','.....uuuuuu..t..','....uuuuuuuu.t..',
    '....Juuuuuu.ssst','....Juuuuuu..t..','.....NNNNNN..t..','.....NNNNNN.....',
    '.....NN..NN.....','.....KK..KK.....','................','................',
  ],
  crew: [
    '................','................','......jjjj......','.....jjjjjj.....',
    '.....jjjjjj.....','......JJJJ......','......JJJJ......','.....YYYYYY..t..',
    '....YYxxxxYY.t..','....YYYYYYYY.t..','....JYYYYYYJ.t..','.....NNNNNN..t..',
    '.....NNNNNN.sss.','.....NN..NN.sss.','.....KK..KK.....','................',
  ],
  truck: [
    '................','................','................','................',
    '..DDDDDDDDDDD...','..dddddddddddDD.','..dxxxxxxxxxdWD.','..dddddddddddWD.',
    '..dddddddddddDD.','..DDDDDDDDDDDDD.','...KK.....KK....','...KK.....KK....',
    '................','................','................','................',
  ],
  plane: [
    '.......xx.......','.......xx.......','......xxxx......','......xddx......',
    '......xxxx......','......xxxx......','.xxxxxxxxxxxxxx.','xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx','.lll..xxxx..lll.','......xxxx......','......xxxx......',
    '......xddx......','....xxxxxxxx....','...xxxxxxxxxx...','................',
  ],
};

function buildSprite16(rows, pal) {
  pal = pal || PAL;
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  for (let j = 0; j < 16; j++) {
    const row = rows[j];
    for (let i = 0; i < 16; i++) {
      const col = pal[row[i]];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

// Crown fire frames: the same flames, one step hotter (white cores).
for (let f = 0; f < 3; f++) {
  SPRITES['crown' + f] = SPRITES['fire' + f].map(row => row.replace(/[fFy]/g, ch => ({ f: 'F', F: 'y', y: 'x' })[ch]));
}
const SPR16 = {};
for (const k in SPRITES) SPR16[k] = buildSprite16(SPRITES[k]);
SPRITES.tank = [
  '................','................','................','......5555......',
  '.....555555.....','.....55KK55.....','.....555555KKKKK','..5555555555....',
  '.55555555555555.','.5K5K5K5K5K5K55.','.55555555555555.','..KKKKKKKKKKKK..',
  '................','................','................','................',
];
SPRITES.cannon = [
  '................','................','................','................',
  '................','..........KK....','........KKKK....','......KKKK......',
  '....KKKK........','..KKKK..........','.KK5555K........','.K555555K.......',
  '..K5555K........','...KKKK.........','................','................',
];
SPRITES.fighter = SPRITES.plane.map(row => row.replace(/x/g, 'S').replace(/d/g, '0').replace(/l/g, '7')); // a grey jet with blue markings
SPRITES.bomber = SPRITES.plane.map(row => row.replace(/x/g, '5').replace(/d/g, '9').replace(/l/g, '7'));
// Raiders wear blue so you can tell the two sides apart.
SPRITES.raider = SPRITES.soldier.map(row => row.replace(/d/g, 'u'));
// Resource buildings and the people who work them.
SPRITES.lumberyard = [
  'gggggggggggggggg','gggggggggggggggg','ggggDDDDDDDDgggg','gggDddddddddDggg',
  'ggDddddddddddDgg','gDDDDDDDDDDDDDDg','gccccccccccccccg','gccmmcccccccmccg',
  'gccmmcccccccmccg','gCCCCCCCCCCCCCCg','gggVVVVVVVVVgggg','ggVzVzVzVzVzVggg',
  'ggVVVVVVVVVVVggg','gggzzzzzzzzzgggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.mine = [
  'gggggggggggggggg','ggggggrrrrgggggg','ggggrrRRRRrrgggg','gggrrRRRRRRrrggg',
  'ggrrRRVVVVRRrrgg','ggrRRVkkkkVRRrgg','grRRVkkkkkkVRRrg','grRRVkkkkkkVRRrg',
  'grRRVkkkkkkVRRrg','grrRVkkkkkkVRrrg','ggrrVkkkkkkVrrgg','gggzzzzzzzzzzggg',
  'ggzz1z1z1z1zzzgg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.quarry = [
  'gggggggggggggggg','ggggRRRRRRRRgggg','gggRssssssssRggg','ggRsRRRRRRRRsRgg',
  'ggRsRssssssRsRgg','ggRsRsRRRRsRsRgg','ggRsRsRssRsRsRgg','ggRsRsRRRRsRsRgg',
  'ggRsRssssssRsRgg','ggRsRRRRRRRRsRgg','gggRssssssssRggg','ggggRRRRRRRRgggg',
  'gggggg4ggg4ggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.well = [
  'gggggggggggggggg','gggggggggggggggg','gggggDDDDDDggggg','ggggDddddddDgggg',
  'gggDddddddddDggg','gggmggggggggmggg','gggmggggggggmggg','gggmgRRRRRRgmggg',
  'gggmRrrvvrrRmggg','ggggRrvvvvrRgggg','ggggRRrvvrRRgggg','ggggRRRRRRRRgggg',
  'gggggggggggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.wheel = [
  'gggggggggggggggg','ggggggVVVVgggggg','ggggVVzzzzVVgggg','gggVzzVVVVzzVggg',
  'ggVzVVggggVVzVgg','ggVzVggggggVzVgg','gVzVgggVVgggVzVg','gVzVgggVVgggVzVg',
  'ggVzVggggggVzVgg','ggVzVVggggVVzVgg','gggVzzVVVVzzVggg','ggggVVzzzzVVgggg',
  'wwwwwwVVVVwwwwww','wwWwwwwwwwwwWwww','wwwwwwwwwwwwwwww','wwwwwwwwwwwwwwww',
];
SPRITES.plant = [
  'ggggggg7gggggggg','ggggggg7gggggggg','ggggggg7gggggggg','ggg9999799999ggg',
  'gg99999999999ggg','gg9999999999999g','gg9D99D99D99D99g','gg9D99D99D99D99g',
  'gg9999999999999g','gg9D99D99D99D99g','gg9D99D99D99D99g','gg9999999999999g',
  'gg99999KK999999g','gg99999KK999999g','g777777777777777','gggggggggggggggg',
];
SPRITES.hydro = [
  'gggggggggggggggg','gggg44444444gggg','ggg4455555544ggg','gg445555555544gg',
  'gg455555555554gg','gg45yy5555yy54gg','gg455y5555y554gg','gg455555555554gg',
  'gg444444444444gg','ggWWWWWWWWWWWWgg','ggwwwwwwwwwwwwgg','gg444444444444gg',
  'gggggggggggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.nuclear = [
  'gggggggggggggggg','ggggg888888ggggg','gggggRRRRRRggggg','gggggR4444Rggggg',
  'gggggR4444Rggggg','gggggR4444Rggggg','ggggR444444Rgggg','ggggR444444Rgggg',
  'gggR44444444Rggg','gggR44444444Rggg','ggR4444444444Rgg','ggRRRRRRRRRRRRgg',
  'g5555555$$55555g','g5555555$$55555g','g55555555555555g','gggggggggggggggg',
];
SPRITES.derrick = [
  'gggggggggggggggg','gggggggggKKKgggg','ggggggggKKgKKggg','gggggKKKKgggKKgg',
  'ggggKKgggKgggKgg','gggKKgggggKggKKg','gggKgggggggKgggg','ggKKKggggggKKggg',
  'ggKgKgggggKgKggg','gKgggKggggKgggKg','gKgggKgggKggggKg','KKKKKKKKKKKKKKKK',
  'zzzzzzzzzzzzzzzz','zzzzzz#zzzzzzzzz','zzzzzzzzzzzzzzzz','gggggggggggggggg',
];
SPRITES.shaft = [
  'gggggggggggggggg','gggggggVVggggggg','ggggggVKKVgggggg','ggggggVKKVgggggg',
  'gggggVggggVggggg','gggggVggggVggggg','ggggVggggggVgggg','ggggVggggggVgggg',
  'gggVggggggggVggg','gggVVVVVVVVVVggg','ggg5KKKKKKKK5ggg','ggg5KKKKKKKK5ggg',
  'ggg5555555555ggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.survey = [
  '................','......K.........','......KEEEE.....','......KEEEEE....',
  '......KEEEE.....','......K.........','......K.........','......K.........',
  '......K.........','.....KKK........','................','................',
  '................','................','................','................',
];
SPRITES.trader = SPRITES.wagon.map(r => r.replace(/H/g, 'E')); // amber canopy: a caravan from beyond the hills
SPRITES.pasture = [
  'gggggggggggggggg','VzVzVzVzVzVzVzVz','gggggggggggggggg','VgggggggGggggggV',
  'gggGgggggggggggg','VggggggggggGgggV','gggggggggggggggg','VgGggggggggggggV',
  'ggggggggggGggggg','VgggggGggggggggV','gggggggggggggggg','VggggggggggggGgV',
  'gggGgggggggggggg','VzVzVzVzVzVzVzVz','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.deer = [
  '................','................','.........tt.....','........tJJ.....',
  '........JJJ.....','.....TTTTJJ.....','....TTTTTTT.....','....TTTTTT......',
  '....TT..TT......','....T...T.......','....T...T.......','................',
  '................','................','................','................',
];
SPRITES.boar = [
  '................','................','................','................',
  '....BBBBBB......','...BBBBBBBB.....','..BBBBBBBBBB....','..BBBBBBBBBk....',
  '..BBBBBBBBBB....','...BB..BB.......','...BB..BB.......','................',
  '................','................','................','................',
];
SPRITES.sheep = [
  '................','................','................','................',
  '.....HHHHHH.....','....HHHHHHHH....','...HHHHHHHHHk...','...HHHHHHHHHk...',
  '....HHHHHHHH....','....kk...kk.....','....kk...kk.....','................',
  '................','................','................','................',
];
SPRITES.cow = [
  '................','................','................','....HHHHHHHH....',
  '...HHKKHHHHHHk..','...HHHHKKHHHHk..','...HHHHHHKKHHk..','...HHHHHHHHHH...',
  '....HH....HH....','....HH....HH....','................','................',
  '................','................','................','................',
];
SPRITES.pig = [
  '................','................','................','................',
  '.....JJJJJJ.....','....JJJJJJJJ....','....JJJJJJJJe...','....JJJJJJJJe...',
  '.....JJ..JJ.....','.....JJ..JJ.....','................','................',
  '................','................','................','................',
];
SPRITES.chicken = [
  '................','................','................','................',
  '................','.......Hd.......','......HHHE......','.....HHHH.......',
  '.....HHHH.......','......HH........','......YY........','................',
  '................','................','................','................',
];
SPRITES.fowl = SPRITES.chicken.map(r => r.replace(/H/g, 'B'));
SPRITES.aurochs = SPRITES.cow.map(r => r.replace(/H/g, 'B'));
SPRITES.hunter = SPRITES.worker.map(r => r.replace(/u/g, 'h'));
SPRITES.wolf = SPRITES.deer.map(r => r.replace(/T/g, 'l').replace(/J/g, 'L').replace(/t/g, 'K')); // grey, lean
SPRITES.bear = SPRITES.boar.map(r => r.replace(/B/g, 'b').replace(/k/g, 'E')); // dark and big
SPRITES.forager = SPRITES.worker.map(r => r.replace(/u/g, 'O').replace(/m/g, 'c')); // green smock, a basket
SPRITES.healer = SPRITES.worker.map(r => r.replace(/u/g, 'S').replace(/m/g, 'x')); // white coat
SPRITES.constable = SPRITES.soldier.map(r => r.replace(/d/g, '0').replace(/l/g, '7')); // blue coat, dark helmet
SPRITES.fugitive = SPRITES.worker.map(r => r.replace(/u/g, '7').replace(/m/g, 'K')); // dark coat, hood up
SPRITES.carrier = SPRITES.worker.map(r => r.replace(/u/g, 'W'));
SPRITES.jungle = [
  'ggg}}}}}}}}ggggg','gg}}}}{{}}}}}ggg','g}}}{{{{{{{}}}}g','g}}{{{{|{{{{}}}g',
  '}}{{{{||{{{{{}}}','}{{{{|||{{{{{{}}','}{{|||||||{{{{}}','g{{||||||||{{{}g',
  'gg{||||||||{{}gg','ggg||||TT|||gggg','gggggTTTTggggggg','ggggTgTTgTgggggg',
  'gggggTTTTggggggg','gggggTTTTggggggg','ggggghTThhgggggg','gggggggggggggggg',
];
SPRITES.airbase = [
  'gggggggggggggggg','gllllllllllllllg','glRRRRRRRRlllllg','glRrrrrrrRlllllg',
  'glRrrddrrRllxllg','glRrrddrrRllxllg','glRrrrrrrRllxllg','glRRRRRRRRllxllg',
  'glllllllllllxllg','gllllllllllllllg','glllllKKKlllxllg','gllllKKKKKllxllg',
  'glllllKKKlllxllg','gllllllKllllxllg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.gaol = [
  'gggggggggggggggg','gggggggggggggggg','gg444444444444gg','gg455555555554gg',
  'gg45K5K5K5K554gg','gg45K5K5K5K554gg','gg45K5K5K5K554gg','gg455555555554gg',
  'gg455555555554gg','gg455557775554gg','gg455557775554gg','gg455557775554gg',
  'gg444444444444gg','gg444444444444gg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.cistern = [
  'gggggggggggggggg','gggggggggggggggg','gggggg4444gggggg','gggg44444444gggg',
  'ggg4400000044ggg','ggg4400000044ggg','ggg4455555544ggg','ggg4455555544ggg',
  'ggg4455555544ggg','ggg4455555544ggg','ggg4455555544ggg','gggg44444444gggg',
  'gggggg4444gggggg','gggggggggggggggg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.watertower = [
  'gggggggggggggggg','gggg44444444gggg','ggg4400000044ggg','ggg4400000044ggg',
  'ggg4400000044ggg','ggg4455555544ggg','gggg44444444gggg','gggggm4444mggggg',
  'gggggmg44gmggggg','ggggmggmmggmgggg','ggggmgmggmgmgggg','gggmggmggggmgggg',
  'gggmgmggggmgmggg','ggmggmggggmggmgg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.healer = [
  'gggggggggggggggg','gggggggggggggggg','ggggg888888ggggg','gggg88888888gggg',
  'ggg8888888888ggg','gg888888888888gg','gccccccccccccccg','gcccoooocccccccg',
  'gcccoooocccmmccg','gccooooooccmmccg','gccooooooccmmccg','gcccoooocccmmccg',
  'gcccoooocccccccg','gCCCCCCCCCCCCCCg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.hospital = [
  'gggggggggggggggg','g88888888888888g','g8SSSSSSSSSSSS8g','g8SSSSSdSSSSSS8g',
  'g8SSSSdddSSSSS8g','g8SSSSSdSSSSSS8g','g8SSSSSSSSSSSS8g','g8S0S0S0S0S0SS8g',
  'g8SSSSSSSSSSSS8g','g8S0S0S0S0S0SS8g','g8SSSSSSSSSSSS8g','g8SSSSS77SSSSS8g',
  'g8SSSSS77SSSSS8g','g88888888888888g','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.gallows = [
  'gggggggggggggggg','gggggggggggggggg','gggmmmmmmmmmmggg','gggmggggggggmggg',
  'gggmggggggggmggg','gggmgggggkggmggg','gggmgggggkggmggg','gggmggggkkkgmggg',
  'gggmggggkkkgmggg','gggmgggggkggmggg','gggmggggkgkgmggg','gggmggggggggmggg',
  'gmmmmmmmmmmmmmmg','gmmmmmmmmmmmmmmg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.grave = [
  'gggggggggggggggg','gggggggggggggggg','ggg4ggggggg4gggg','gg444ggggg444ggg',
  'ggg4ggggggg4gggg','ggg4ggg4ggg4gggg','gggggg444ggggggg','ggggggg4gggggggg',
  'ggg4ggg4ggg4gggg','gg444ggggg444ggg','ggg4ggggggg4gggg','ggg4ggggggg4gggg',
  'gggggggggggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.monument = [
  'gggggggggggggggg','gggggggggggggggg','ggggggg66ggggggg','gggggg6666gggggg',
  'ggggggg66ggggggg','gggggg6666gggggg','ggggg666666ggggg','gggggg6666gggggg',
  'gggggg6666gggggg','gggggg6666gggggg','ggggg444444ggggg','gggg44444444gggg',
  'ggg4444444444ggg','ggg4444444444ggg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
SPRITES.felled = [
  'gggggggggggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
  'gggggggggggggggg','gggggggggggggggg','ggggggggggggtggg','ggggggVVVVggtggg',
  'gggggVccccVgtggg','gggggVcVVcVggggg','gggggVccccVggggg','ggggggVVVVgggggg',
  'ggggghTTTThggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.granary = [
  'gggggggggggggggg','ggggggDDDDgggggg','gggggDddddDggggg','ggggDddddddDgggg',
  'gggDddddddddDggg','ggDDDDDDDDDDDDgg','ggV66666666666gg','ggV66666666666gg',
  'ggV6666VV666666g','ggV6666VV66666Vg','ggV6666VV66666Vg','ggV6666VV66666Vg',
  'ggVVVVVVVVVVVVgg','gZZZZZZZZZZZZZZg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.site = [
  'gggggggggggggggg','gVgggggggggggVgg','gVVVVVVVVVVVVVgg','gVgggggggggggVgg',
  'gVggVVVVVVVggVgg','gVggVgggggVggVgg','gVVVVVVVVVVVVVgg','gVggVgggggVggVgg',
  'gVggVVVVVVVggVgg','gVgggggggggggVgg','gVVVVVVVVVVVVVgg','gVgggzzzzzgggVgg',
  'gVggzzzzzzzggVgg','zzzzzzzzzzzzzzzz','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.farm0 = SPRITES.farm.map(r => r.replace(/6/g, 'z')); // bare furrows
SPRITES.farm1 = SPRITES.farm.map(r => r.replace(/6/g, 'P')); // green shoots
SPRITES.cactus = [
  'cccccccccccccccc','ccccccc}}ccccccc','ccccccc}}ccccccc','ccc}}cc}}ccccccc',
  'ccc}}cc}}cc}}ccc','ccc}}cc}}cc}}ccc','ccc}}}}}}cc}}ccc','cccccc}}}}}}cccc',
  'ccccccc}}ccccccc','ccccccc}}ccccccc','ccccccc}}ccccccc','ccccccc}}ccccccc',
  'cccccc}}}}cccccc','cccccCCCCCCccccc','cccccccccccccccc','cccccccccccccccc',
];
SPRITES.sand = [
  'cccccccccccccccc','ccCcccccccccccCc','cccccccccCcccccc','cccccccccccccccc',
  'cCcccccccccccccc','ccccccCccccccccc','ccccccccccccCccc','cccccccccccccccc',
  'cccccccccCcccccc','ccCccccccccccccc','cccccccccccccccc','cccccCcccccccCcc',
  'cccccccccccccccc','ccccccccccCccccc','cCcccccccccccccc','cccccccccccccccc',
];
SPRITES.reeds = [
  'gggggggggggggggg','ggEgggggggEggggg','ggqgggEgggqggggg','ggqgggqgggqggEgg',
  'gEqggEqgggqggqgg','gqqggqqgEgqggqgg','gqqgEqqgqgqgEqgg','gqqgqqqgqgqgqqgg',
  'gqqgqqqgqgqqqqgg','qqqqqqqqqqqqqqqq','qqqqqqqqqqqqqqqq','gqqgqqggqqgqqgqg',
  'gggggggggggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
];
SPRITES.solar = [
  'gggggggggggggggg','gggggggggggggggg','g55555555555555g','g5uuu5uuu5uuu55g',
  'g5uuu5uuu5uuu55g','g55555555555555g','g5uuu5uuu5uuu55g','g5uuu5uuu5uuu55g',
  'g55555555555555g','g5uuu5uuu5uuu55g','g5uuu5uuu5uuu55g','g55555555555555g',
  'ggg7ggggggg7gggg','ggg7ggggggg7gggg','gggggggggggggggg','gggggggggggggggg',
];
// Ore seams: the rock sprite flecked with the metal.
const ORE_KEYS = ['', 'oreIron', 'oreCopper', 'oreCoal', 'oreUranium', 'oil', 'oreGold'];
const ORE_NAMES = ['', 'iron', 'copper', 'coal', 'uranium', 'oil', 'gold'];
[['oreIron', '!', 71], ['oreCopper', '@', 72], ['oreCoal', '#', 73], ['oreUranium', '$', 74], ['oreGold', '&', 75]].forEach(([k, ch, seed]) => {
  SPRITES[k] = SPRITES.rock.map((row, j) => row.split('').map((c, i) => (c === 'r' || c === 's') && hash2(i, j, seed) < (ch === '#' ? 0.4 : 0.28) ? ch : c).join(''));
});
SPRITES.logger = SPRITES.worker.map(r => r.replace(/u/g, 'd')); // red plaid
SPRITES.miner = SPRITES.worker.map(r => r.replace(/u/g, '7').replace(/m/g, 'Y')); // dark coat, yellow helmet
// Stone: the same buildings in grey ashlar under slate, for towns that have learned masonry.
const STONE_SWAP = { c: 'R', C: 'r', d: 'l', D: '7', u: 'L', U: '5', '8': 'R', '6': 'r', '9': 'l' };
const STONE_KEYS = ['house0', 'house1', 'tenement', 'granary', 'townhall', 'barracks', 'gaol', 'hospital', 'healer', 'station', 'university'];
for (const k of STONE_KEYS) SPRITES[k + '_s'] = SPRITES[k].map(r => r.replace(/[cCdDuU869]/g, ch => STONE_SWAP[ch]));
SPRITES.shell = [ // a burnt-out stone house: walls standing, roof gone, black inside
  'gggggggggggggggg','gggggggggggggggg','gggggggggggggggg','gggggggggggggggg',
  'gggggggggggggggg','gggRrrRggRrRRggg','gRrRRrRRRRrRRrRg','gRkkkkkkkkkkkkRg',
  'grkkbkkkkkbkkkrg','gRkkkkkkkkkkkkRg','grkkkkkkkbkkkkrg','gRkkkkkkkkkkkkRg',
  'gRrrRrRRrRrRRrRg','grrrrrrrrrrrrrrg','ZZZZZZZZZZZZZZZZ','gggggggggggggggg',
];
for (const k of ['raider', 'tank', 'cannon', 'bomber', 'lumberyard', 'mine', 'quarry', 'well', 'wheel', 'plant', 'solar', 'oreIron', 'oreCopper', 'oreCoal', 'oreUranium', 'oreGold', 'logger', 'miner', 'hydro', 'nuclear', 'derrick', 'shaft', 'survey', 'trader', 'pasture', 'deer', 'boar', 'sheep', 'cow', 'pig', 'chicken', 'fowl', 'aurochs', 'hunter', 'carrier', 'reeds', 'sand', 'jungle', 'cactus', 'site', 'farm0', 'farm1', 'granary', 'felled', 'airbase', 'fighter', 'gaol', 'constable', 'fugitive', 'cistern', 'watertower', 'healer', 'hospital', 'forager', 'gallows', 'grave', 'monument', 'wolf', 'bear', 'shell', ...STONE_KEYS.map(k => k + '_s')]) SPR16[k] = buildSprite16(SPRITES[k]);
