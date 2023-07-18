export const correctWrongPlayers = (player: {
  id?: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  gender?: 'M' | 'F';
  club?: number;
}): {
  id?: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  gender?: 'M' | 'F';
  club?: number;
} => {
  // Yaro Van Delsen
  if (
    (player.memberId === '' &&
      player.firstName === 'Yaro' &&
      player.lastName === 'Van Delsen') ||
    (player.memberId === '98443' &&
      player.firstName === 'Yaro' &&
      player.lastName === 'Van Delsen')
  ) {
    return {
      ...player,
      memberId: '50110338', 
    };
  }

  // Lien Lammertyn
  if (
    (player.memberId === '' &&
      player.firstName === 'Lien' &&
      player.lastName === 'Lammertyn') ||
    (player.memberId === '94823' &&
      player.firstName === 'Lien' &&
      player.lastName === 'Lammertyn')
  ) {
    return {
      ...player,
      memberId: '50108104',
    };
  }

  // Charles Fouyn
  if (
    (player.memberId === '' &&
      player.firstName === 'Charles' &&
      player.lastName === 'Fouyn') ||
    (player.memberId === '94823' &&
      player.firstName === 'Charles' &&
      player.lastName === 'Fouyn')
  ) {
    return {
      ...player,
      memberId: '50111020',
    };
  }

  // Iljo Van Delsen
  if (
    (player.memberId === '' &&
      player.firstName === 'Iljo' &&
      player.lastName === 'Van Delsen') ||
    (player.memberId === '84412' &&
      player.firstName === 'Iljo' &&
      player.lastName === 'Van Delsen')
  ) {
    return {
      ...player,
      memberId: '50110337',
    };
  }

  // Noa Swinnen
  if (
    (player.memberId === '' &&
      player.firstName === 'Noa' &&
      player.lastName === 'Swinnen') ||
    (player.memberId === '70299' &&
      player.firstName === 'Noa' &&
      player.lastName === 'Swinnen')
  ) {
    return {
      ...player,
      memberId: '50116742',
    };
  }

  // Wannes Soenen
  if (
    (player.memberId === '' &&
      player.firstName === 'Wannes' &&
      player.lastName === 'Soenen') ||
    (player.memberId === '75425' &&
      player.firstName === 'Wannes' &&
      player.lastName === 'Soenen')
  ) {
    return {
      ...player,
      memberId: '50716581',
    };
  }

  // Liam Bauwens
  if (
    (player.memberId === '' &&
      player.firstName === 'Liam' &&
      player.lastName === 'Bauwens') ||
    (player.memberId === '76198' &&
      player.firstName === 'Liam' &&
      player.lastName === 'Bauwens')
  ) {
    return {
      ...player,
      memberId: '50108141',
    };
  }

  // Andreas de Winné
  if (
    (player.memberId === '' &&
      player.firstName === 'Andreas' &&
      player.lastName === 'De Winné') ||
    (player.memberId === '79663' &&
      player.firstName === 'Andreas' &&
      player.lastName === 'De Winné')
  ) {
    return {
      ...player,
      memberId: '50114827',
    };
  }

  // Siebelijn De Sutter
  if (
    (player.memberId === '' &&
      player.firstName === 'Siebelijn' &&
      player.lastName === 'De Sutter') ||
    (player.memberId === '64263' &&
      player.firstName === 'Siebelijn' &&
      player.lastName === 'De Sutter')
  ) {
    return {
      ...player,
      memberId: '50110011',
    };
  }

  // Arthur De Baere
  if (
    (player.memberId === '' &&
      player.firstName === 'Arthur' &&
      player.lastName === 'De Baere') ||
    (player.memberId === '' &&
      player.firstName === 'Arthur' &&
      player.lastName === 'Debaere') ||
    (player.memberId === '64263' &&
      player.firstName === 'Arthur' &&
      player.lastName === 'De Baere')
  ) {
    return {
      ...player,
      memberId: '50104587',
    };
  }

  // Caitlyn De Bree
  if (
    player.memberId === '' &&
    player.firstName === 'Caitlyn' &&
    player.lastName === 'De Bree'
  ) {
    return {
      ...player,
      memberId: '50130927',
    };
  }

  // Jenny Bender
  if (
    (player.memberId === '' &&
      player.firstName === 'Jenny' &&
      player.lastName === 'Bender') ||
    (player.memberId === '50073760' &&
      player.firstName === 'Jenny' &&
      player.lastName === 'Bender')
  ) {
    return {
      ...player,
      memberId: '50073670',
    };
  }

  // Dorrit Van Herteryck
  if (
    player.memberId === '50103913' &&
    player.firstName === 'Dorrit' &&
    player.lastName === 'Van Hertenryck'
  ) {
    return {
      ...player,
      lastName: 'Van Herteryck',
    };
  }

  // Cy-Jay Somers
  if (player.memberId === '50100297') {
    return {
      ...player,
      firstName: 'Cy-Jay',
    };
  }

  // Hild Dams
  if (
    player.memberId === '50017308' &&
    player.firstName === 'Hilde' &&
    player.lastName === 'Dams'
  ) {
    return {
      ...player,
      firstName: 'Hild',
    };
  }

  // Noa Dauphinais
  if (
    (player.memberId === '' &&
      player.firstName === 'Noa' &&
      player.lastName === 'Dauphinais') ||
    (player.memberId === '30007379' &&
      player.firstName === 'Noa' &&
      player.lastName === 'Dauhphinais')
  ) {
    return {
      ...player,
      memberId: '30007379',
      lastName: 'Dauphinais',
    };
  }
  // Léa Dauphinais
  if (
    player.memberId === '30082546' &&
    player.firstName === 'LéA' &&
    player.lastName === 'Dauhphinais'
  ) {
    return {
      ...player,
      firstName: 'Léa',
      lastName: 'Dauphinais',
    };
  }
  // Jean-Pierre Benjamin
  if (
    player.memberId === '30047681' &&
    player.firstName === 'Jean Pierre' &&
    player.lastName === 'Benjamin'
  ) {
    return {
      ...player,
      firstName: 'Jean-Pierre',
    };
  }
  // Birthe Van Den Berg
  if (
    player.memberId === '50078116' &&
    player.firstName === 'Van Den Berg' &&
    player.lastName === 'Birthe'
  ) {
    return {
      ...player,
      firstName: 'Birthe',
      lastName: 'Van Den Berg',
    };
  }
  // Fae Boonen
  if (
    player.memberId === '' &&
    player.firstName === 'Fae' &&
    player.lastName === 'Boonen'
  ) {
    return {
      ...player,
      memberId: '50417193',
    };
  }
  // Amber Boonen
  if (
    player.memberId === '' &&
    player.firstName === 'Amber' &&
    player.lastName === 'Boonen'
  ) {
    return {
      ...player,
      memberId: '50281089',
    };
  }
  // Eloime Bossuwé
  if (
    player.memberId === '50106212' &&
    player.firstName === 'Eloime' &&
    player.lastName === 'Bossuwe'
  ) {
    return {
      ...player,
      lastName: 'Bossuwé',
    };
  }
  // Margot Bossuwé
  if (
    player.memberId === '50252607' &&
    player.firstName === 'Margot' &&
    player.lastName === 'Bossuwe'
  ) {
    return {
      ...player,
      lastName: 'Bossuwé',
    };
  }
  // Merel Braeckman
  if (
    player.memberId === '50116755' &&
    player.firstName === 'Merel' &&
    player.lastName === 'Cbraeckman'
  ) {
    return {
      ...player,
      lastName: 'Braeckman',
    };
  }
  // Eubil Shannon Cabije
  if (
    (player.memberId === '' &&
      player.firstName === 'Eubil' &&
      player.lastName === 'Cabije') ||
    (player.memberId === '50115058' &&
      player.firstName === 'Eubil' &&
      player.lastName === 'Cabije')
  ) {
    return {
      ...player,
      memberId: '50115058',
      firstName: 'Eubil Shannon',
    };
  }
  // Leila De Cabooter
  if (
    player.memberId === '50105971' &&
    player.firstName === 'Leila' &&
    player.lastName === 'Decabooter'
  ) {
    return {
      ...player,
      lastName: 'De Cabooter',
    };
  }
  // Steve Aylott
  if (
    player.memberId === '1213495' &&
    player.firstName === 'Steve' &&
    player.lastName === 'Aylot'
  ) {
    return {
      ...player,
      lastName: 'Aylott',
    };
  }

  // Céline Duboccage
  if (
    player.memberId === '50648098' &&
    player.firstName === 'CéLine' &&
    player.lastName === 'Duboccage'
  ) {
    return {
      ...player,
      firstName: 'Celine',
    };
  }
  // Jude Ashman
  if (
    player.memberId === '1259280' &&
    player.firstName === 'Judith' &&
    player.lastName === 'Ashman'
  ) {
    return {
      ...player,
      firstName: 'Jude',
    };
  }
  // Farid Fouaad
  if (
    player.memberId === '30082896' &&
    player.firstName === 'Farid' &&
    player.lastName === 'Fouad'
  ) {
    return {
      ...player,
      lastName: 'Fouaad',
    };
  }
  // Matisse Ghesquiere
  if (
    (player.memberId === '50090875' &&
      player.firstName === 'Mattis' &&
      player.lastName === 'Ghesquiere') ||
    (player.memberId === '50090875' &&
      player.firstName === 'Mattise' &&
      player.lastName === 'Ghesquiere')
  ) {
    return {
      ...player,
      firstName: 'Matisse',
      lastName: 'GhesquièRe',
    };
  }
  // Wolf Hoebeke
  if (
    player.memberId === '' &&
    player.firstName === 'Wolf' &&
    player.lastName === 'Hoebeke'
  ) {
    return {
      ...player,
      memberId: '50414194',
    };
  }
  // Hamzah Anees Mahmood
  if (
    (player.memberId === '1290451' &&
      player.firstName === 'Hamza' &&
      player.lastName === 'Mahmood') ||
    (player.memberId === '1290451' &&
      player.firstName === 'Hamzah' &&
      player.lastName === 'Mahmood') ||
    (player.memberId === '1320833' &&
      player.firstName === 'Hamzah' &&
      player.lastName === 'Anees Mahmood') ||
    (player.memberId === '1320833' &&
      player.firstName === 'Hamza' &&
      player.lastName === 'Mahmood') ||
    (player.memberId === '1290451' &&
      player.firstName === 'Hamzah Anees' &&
      player.lastName === 'Mahmood')
  ) {
    return {
      ...player,
      memberId: '1290451',
      firstName: 'Hamzah',
      lastName: 'Anees Mahmood',
    };
  }

  // Umar Javaid
  if (
    player.memberId === '30092403' &&
    player.firstName === 'Javaid' &&
    player.lastName === 'Umair'
  ) {
    return {
      ...player,
      firstName: 'Umair',
      lastName: 'Javaid',
    };
  }
  // Kaat Keymolen
  if (
    player.memberId === '' &&
    player.firstName === 'Kaat' &&
    player.lastName === 'Keymolen'
  ) {
    return {
      ...player,
      memberId: '50923374',
    };
  }
  // Ine Lanckriet
  if (
    player.memberId === '50083201' &&
    player.firstName === 'Lanckriet' &&
    player.lastName === 'Ine'
  ) {
    return {
      ...player,
      firstName: 'Ine',
      lastName: 'Lanckriet',
    };
  }
  // Seung Woo (Peter) Lee
  if (
    player.memberId === '' &&
    player.firstName === 'Seung Woo' &&
    player.lastName === 'Lee'
  ) {
    return {
      ...player,
      firstName: 'Seung Woo (Peter)',
      memberId: '30074516',
    };
  }
  // Maarten Lenaerts
  if (
    player.memberId === '50078931' &&
    player.firstName === 'Maarten' &&
    player.lastName === 'Lenaarts'
  ) {
    return {
      ...player,
      lastName: 'Lenaerts',
    };
  }
  // Pieter Barbé
  if (
    player.memberId === '50068881' &&
    player.firstName === 'Pieter' &&
    player.lastName === 'Barbe'
  ) {
    return {
      ...player,
      lastName: 'Barbé',
    };
  }
  // Sielke Barrez
  if (
    player.memberId === '50065873' &&
    player.firstName === 'Silke' &&
    player.lastName === 'Barrez'
  ) {
    return {
      ...player,
      firstName: 'Sielke',
    };
  }
  // Aurélie Baijot
  if (
    (player.memberId === '30049221' &&
      player.firstName === 'Aurelie' &&
      player.lastName === 'Baijot') ||
    (player.memberId === '30049221' &&
      player.firstName === 'AuréLie' &&
      player.lastName === 'Baijot')
  ) {
    return {
      ...player,
      firstName: 'Aurélie',
    };
  }
  // Louise Balthazar
  if (
    player.memberId === '30072399' &&
    player.firstName === 'Louise' &&
    player.lastName === 'Balthazard'
  ) {
    return {
      ...player,
      lastName: 'Balthazar',
    };
  }
  // Jimmy Beliën
  if (
    (player.memberId === '50018619' &&
      player.firstName === 'Jimmy' &&
      player.lastName === 'Belien') ||
    (player.memberId === '50018619' &&
      player.firstName === 'Jimmy' &&
      player.lastName === 'BeliëN')
  ) {
    return {
      ...player,
      lastName: 'Beliën',
    };
  }
  //  Mélanie Bergamo
  if (
    (player.memberId === '30049358' &&
      player.firstName === 'Melanie' &&
      player.lastName === 'Bergamo') ||
    (player.memberId === '30049358' &&
      player.firstName === 'MéLanie' &&
      player.lastName === 'Bergamo')
  ) {
    return {
      ...player,
      firstName: 'Mélanie',
    };
  }

  //  Célestine Bernard
  if (
    (player.memberId === '30038234' &&
      player.firstName === 'Celestine' &&
      player.lastName === 'Bernard') ||
    (player.memberId === '30038234' &&
      player.firstName === 'CéLestine' &&
      player.lastName === 'Bernard')
  ) {
    return {
      ...player,
      firstName: 'Célestine',
    };
  }
  //  Sébastien Binet
  if (
    (player.memberId === '30035942' &&
      player.firstName === 'SéBastien' &&
      player.lastName === 'Binet') ||
    (player.memberId === '30035942' &&
      player.firstName === 'Sebastien' &&
      player.lastName === 'Binet')
  ) {
    return {
      ...player,
      firstName: 'Sébastien',
    };
  }
  //  Stéphane Bol
  if (
    (player.memberId === '30046469' &&
      player.firstName === 'StéPhane' &&
      player.lastName === 'Bol') ||
    (player.memberId === '30046469' &&
      player.firstName === 'Stephane' &&
      player.lastName === 'Bol')
  ) {
    return {
      ...player,
      firstName: 'Stéphane',
    };
  }
  //  Céline Bonnet
  if (
    (player.memberId === '30025250' &&
      player.firstName === 'CéLine' &&
      player.lastName === 'Bonnet') ||
    (player.memberId === '30025250' &&
      player.firstName === 'Celine' &&
      player.lastName === 'Bonnet')
  ) {
    return {
      ...player,
      firstName: 'Céline',
    };
  }
  //  François Boucherie
  if (
    (player.memberId === '30043727' &&
      player.firstName === 'Francois' &&
      player.lastName === 'Boucherie') ||
    (player.memberId === '30043727' &&
      player.firstName === 'FrançOis' &&
      player.lastName === 'Boucherie')
  ) {
    return {
      ...player,
      firstName: 'François',
    };
  }
  //  Mackenzie Bougelet
  if (
    player.memberId === '30003976' &&
    player.firstName === 'Mac Kenzie' &&
    player.lastName === 'Bougelet'
  ) {
    return {
      ...player,
      firstName: 'Mackenzie',
    };
  }
  //  Serge Bouhière
  if (
    (player.memberId === '30017044' &&
      player.firstName === 'Serge' &&
      player.lastName === 'Bouhiere') ||
    (player.memberId === '30017044' &&
      player.firstName === 'Serge' &&
      player.lastName === 'BouhièRe')
  ) {
    return {
      ...player,
      lastName: 'Bouhière',
    };
  }
  //  Jean-Michel Bourgois
  if (player.memberId === '30046508' && player.lastName === 'Bourgois') {
    return {
      ...player,
      firstName: 'Jean-Michel',
    };
  }

  // BenoîT Wiltgen
  if (player.memberId === '30033462' && player.lastName === 'Wiltgen') {
    return {
      ...player,
      firstName: 'Benoît',
    };
  }

  //  Benoît Boursoit
  if (player.memberId === '30021686' && player.lastName === 'Boursoit') {
    return {
      ...player,
      firstName: 'Benoît',
    };
  }
  //  Jérôme Braziewicz
  if (player.memberId === '30023601' && player.lastName === 'Braziewicz') {
    return {
      ...player,
      firstName: 'Jérôme',
    };
  }
  //  Marie Laure Brimbois
  if (
    player.memberId === '50083045' &&
    player.firstName === 'Brimbois' &&
    player.lastName === 'Marie Laure'
  ) {
    return {
      ...player,
      firstName: 'Marie Laure',
      lastName: 'Brimbois',
    };
  }
  //  Kay-Leigh Bruers
  if (
    player.memberId === '50067545' &&
    player.firstName === 'Kay Leigh' &&
    player.lastName === 'Bruers'
  ) {
    return {
      ...player,
      firstName: 'Kay-Leigh',
    };
  }
  //  Loria Buccoleri
  if (
    player.memberId === '30093145' &&
    player.firstName === 'Loria Ruxendra' &&
    player.lastName === 'Buccoleri'
  ) {
    return {
      ...player,
      firstName: 'Loria',
    };
  }
  //  Louise Buckinx
  if (player.memberId === '50115212' && player.firstName === 'Louise') {
    return {
      ...player,
      lastName: 'Buckinx',
    };
  }
  //  Gauthier Calus
  if (
    player.memberId === '50625748' &&
    player.firstName === 'Gaulthier' &&
    player.lastName === 'Calus'
  ) {
    return {
      ...player,
      firstName: 'Gauthier',
    };
  }

  //  Alexandre Chun
  if (
    player.memberId === '50005758' &&
    player.firstName === 'Alexander' &&
    player.lastName === 'Chun'
  ) {
    return {
      ...player,
      firstName: 'Alexandre',
    };
  }
  //  Adrian Ciscato
  if (
    player.memberId === '50261126' &&
    player.firstName === 'Ciscato' &&
    player.lastName === 'Adrian'
  ) {
    return {
      ...player,
      firstName: 'Adrian',
      lastName: 'Ciscatto',
    };
  }
  //  Arne Bossaert
  if (
    player.memberId === '50508261' &&
    player.firstName === 'Arne' &&
    player.lastName === 'Bossart'
  ) {
    return {
      ...player,
      lastName: 'Bossaert',
    };
  }
  //  Fabian Colard
  if (
    player.memberId === '30081306' &&
    player.firstName === 'Fbian' &&
    player.lastName === 'Colard'
  ) {
    return {
      ...player,
      firstName: 'Fabian',
    };
  }
  //  Mathieu Coppée
  if (player.memberId === '30006294' && player.firstName === 'Mathieu') {
    return {
      ...player,
      lastName: 'Coppée',
    };
  }
  //  Anne Declerck
  if (
    player.memberId === '50083241' &&
    player.firstName === 'Anne' &&
    player.lastName === 'Declerck'
  ) {
    return {
      ...player,
      lastName: 'Declerck',
    };
  }
  //  Geoffrey De Ketelaere
  if (
    player.memberId === '50232517' &&
    player.firstName === 'Geoffey' &&
    player.lastName === 'De Ketelaere'
  ) {
    return {
      ...player,
      firstName: 'Geoffrey',
    };
  }
  //  Cédric De Leeuw
  if (
    player.memberId === '50104883' &&
    player.firstName === 'CéDric' &&
    player.lastName === 'De Leeuw'
  ) {
    return {
      ...player,
      firstName: 'Cédric',
    };
  }
  //  Mathias De Meyer
  if (
    player.memberId === '50115215' &&
    player.firstName === 'Matthias' &&
    player.lastName === 'De Meyer'
  ) {
    return {
      ...player,
      firstName: 'Mathias',
    };
  }
  //  Michaël De Rechter
  if (player.memberId === '50071454' && player.lastName === 'De Rechter') {
    return {
      ...player,
      firstName: 'Michaël',
    };
  }
  //  Daan De Vrij
  if (
    player.memberId === '50114173' &&
    player.firstName === 'Daan' &&
    player.lastName === 'De Vry'
  ) {
    return {
      ...player,
      lastName: 'De Vrij',
    };
  }
  //  Ofelie De Wel
  if (
    player.memberId === '50066105' &&
    player.firstName === 'Oefelie' &&
    player.lastName === 'De Wel'
  ) {
    return {
      ...player,
      firstName: 'Ofelie',
    };
  }
  //  Luka De Wilde
  if (
    player.memberId === '30079089' &&
    player.firstName === 'Luca' &&
    player.lastName === 'De Wilde'
  ) {
    return {
      ...player,
      firstName: 'Luka',
    };
  }
  //  Peter Decaluwé
  if (
    player.memberId === '50023834' &&
    player.firstName === 'Peter' &&
    player.lastName === 'Decaluwe'
  ) {
    return {
      ...player,
      lastName: 'Decaluwé',
    };
  }
  //  Jean-Pierre Delplanque
  if (
    player.memberId === '30034088' &&
    player.firstName === 'Jean Pierre' &&
    player.lastName === 'Delplanque'
  ) {
    return {
      ...player,
      firstName: 'Jean-Pierre',
    };
  }

  //  Marie Demy
  if (
    player.memberId === '30031652' &&
    player.firstName === 'Mary' &&
    player.lastName === 'Demy'
  ) {
    return {
      ...player,
      firstName: 'Marie',
    };
  }
  //  Jérémie Denis
  if (player.memberId === '30049255' && player.lastName === 'Denis') {
    return {
      ...player,
      firstName: 'Jérémie',
    };
  }
  //  Stephanie Deroo
  if (player.memberId === '30036428' && player.lastName === 'Deroo') {
    return {
      ...player,
      firstName: 'Stéphanie',
    };
  }
  //  Jan Deschagt
  if (player.memberId === '50022254' && player.firstName === 'Jan') {
    return {
      ...player,
      lastName: 'Deschagt',
    };
  }
  //  Sam Dewaegenaere
  if (
    player.memberId === '500987119' &&
    player.firstName === 'Sam' &&
    player.lastName === 'Dewaegenare'
  ) {
    return {
      ...player,
      lastName: 'Dewaegenaere',
    };
  }

  //  Noé Dubois
  if (
    player.memberId === '30050777' &&
    player.firstName === 'Noe' &&
    player.lastName === 'Dubois'
  ) {
    return {
      ...player,
      firstName: 'Noé',
    };
  }
  //  Karyn Duggan
  if (
    player.memberId === '1107256' &&
    player.firstName === 'Karryn' &&
    player.lastName === 'Dugan'
  ) {
    return {
      ...player,
      firstName: 'Karyn',
    };
  }
  //  Eddy Duprée
  if (player.memberId === '890356' && player.firstName === 'Eddy') {
    return {
      ...player,
      lastName: 'Duprée',
    };
  }
  //  Els Duré
  if (
    player.memberId === '50073676' &&
    player.firstName === 'Els' &&
    player.lastName === 'Dure'
  ) {
    return {
      ...player,
      lastName: 'Duré',
    };
  }
  //  François Dusart
  if (
    player.memberId === '30060989' &&
    player.firstName === 'FrançOis' &&
    player.lastName === 'Dussart'
  ) {
    return {
      ...player,
      firstName: 'François',
      lastName: 'Dusart',
    };
  }
  //  Sarina Eerdekens
  if (
    player.memberId === '50219812' &&
    player.firstName === 'Safina' &&
    player.lastName === 'Eerdekens'
  ) {
    return {
      ...player,
      firstName: 'Sarina',
    };
  }
  //  Edwin Ekiring
  if (
    player.memberId === '882603' &&
    player.firstName === 'Edwin' &&
    player.lastName === 'Ekering'
  ) {
    return {
      ...player,
      lastName: 'Ekiring',
    };
  }
  //  Manikandan Elumalai
  if (
    player.memberId === '50825275' &&
    player.firstName === 'Manikandan' &&
    player.lastName === 'Elumazhai'
  ) {
    return {
      ...player,
      lastName: 'Elumalai',
    };
  }
  //  Marie Pierre Even
  if (
    player.memberId === '30017323' &&
    player.firstName === 'Marie  Pierre' &&
    player.lastName === 'Even'
  ) {
    return {
      ...player,
      firstName: 'Marie Pierre',
    };
  }
  //  Cédric Falter
  if (player.memberId === '30051179' && player.lastName === 'Falter') {
    return {
      ...player,
      firstName: 'Cédric',
    };
  }
  //  Michael Fedoroff
  if (
    player.memberId === '30052658' &&
    player.firstName === 'Michael' &&
    player.lastName === 'Federoff'
  ) {
    return {
      ...player,
      lastName: 'Fedoroff',
    };
  }
  //  Lukas Félix
  if (player.memberId === '50098113' && player.firstName === 'Lukas') {
    return {
      ...player,
      lastName: 'Félix',
    };
  }
  //  Marie Anne Fieve
  if (
    player.memberId === '50074708' &&
    player.firstName === 'Marie-Anne' &&
    player.lastName === 'FiéVé'
  ) {
    return {
      ...player,
      firstName: 'Marie Anne',
      lastName: 'Fieve',
    };
  }
  //  Mathieu Flamé
  if (
    player.memberId === '30039047' &&
    player.firstName === 'Mathieu' &&
    player.lastName === 'Flame'
  ) {
    return {
      ...player,
      lastName: 'Flamé',
    };
  }
  //  Michaël Floré
  if (
    (player.memberId === '50070989' && player.lastName === 'Flore') ||
    (player.memberId === '50070989' && player.firstName === 'Michael')
  ) {
    return {
      ...player,
      firstName: 'Michaël',
      lastName: 'Floré',
    };
  }
  //  Grégory Frecourt
  if (
    (player.memberId === '30058929' &&
      player.firstName === 'GréGory' &&
      player.lastName === 'Frecourt') ||
    (player.memberId === '30058929' &&
      player.firstName === 'Gregory' &&
      player.lastName === 'Frecourt')
  ) {
    return {
      ...player,
      firstName: 'Grégory',
    };
  }
  //  Christine Gabriel
  if (
    player.memberId === '30031947' &&
    player.firstName === 'Chirstine' &&
    player.lastName === 'Gabriel'
  ) {
    return {
      ...player,
      firstName: 'Christine',
    };
  }
  //  Jurgen Gabriëls
  if (
    player.memberId === '50048396' &&
    player.firstName === 'Jurgen' &&
    player.lastName === 'GabriëLs'
  ) {
    return {
      ...player,
      lastName: 'Gabriëls',
    };
  }
  //  Heide Gabriëls
  if (
    player.memberId === '50047' &&
    player.firstName === 'Heidi' &&
    player.lastName === 'GabriëLs'
  ) {
    return {
      ...player,
      lastName: 'Gabriëls',
    };
  }
  //  Maude Galloy
  if (
    player.memberId === '30019792' &&
    player.firstName === 'Maude' &&
    player.lastName === 'Galoy'
  ) {
    return {
      ...player,
      lastName: 'Galloy',
    };
  }
  //  Tomas Garcia Soler
  if (
    player.memberId === '50778331' &&
    player.firstName === 'Thomas' &&
    player.lastName === 'Garcia Soler'
  ) {
    return {
      ...player,
      firstName: 'Tomas',
    };
  }
  //  Niels Garrein
  if (
    player.memberId === '50092430' &&
    player.firstName === 'Niels' &&
    player.lastName === 'Garein'
  ) {
    return {
      ...player,
      lastName: 'Garrein',
    };
  }
  //  Frédéric Gaston
  if (
    (player.memberId === '30047333' &&
      player.firstName === 'FréDéRic' &&
      player.lastName === 'Gaston') ||
    (player.memberId === '30047333' &&
      player.firstName === 'Frederic' &&
      player.lastName === 'Gaston')
  ) {
    return {
      ...player,
      firstName: 'Fréderic',
    };
  }
  //  Wout Geldhof
  if (
    player.memberId === '50069898' &&
    player.firstName === 'Wout' &&
    player.lastName === 'Geldof'
  ) {
    return {
      ...player,
      lastName: 'Geldhof',
    };
  }
  //  Maïté Lamont
  if (
    (player.memberId === '50055238' &&
      player.firstName === 'Maité' &&
      player.lastName === 'Lamont') ||
    (player.memberId === '50055238' &&
      player.firstName === 'Maite' &&
      player.lastName === 'Lamont') ||
    (player.memberId === '50055238' &&
      player.firstName === 'MaïTé' &&
      player.lastName === 'Lamont')
  ) {
    return {
      ...player,
      firstName: 'Maïté',
    };
  }

  //  Björge Luyten
  if (
    (player.memberId === '50081681' &&
      player.firstName === 'Bjorge' &&
      player.lastName === 'Luyten') ||
    (player.memberId === '50081681' &&
      player.firstName === 'BjöRge' &&
      player.lastName === 'Luyten')
  ) {
    return {
      ...player,
      firstName: 'Björge',
    };
  }

  //  Joren Robberecht
  if (
    player.memberId === '50116450' &&
    player.firstName === 'Joren' &&
    player.lastName === 'Robbrecht'
  ) {
    return {
      ...player,
      lastName: 'Robberecht',
    };
  }

  //  Saravana Rajkumar
  if (
    player.memberId === '50448374' &&
    player.firstName === 'Rajkumar' &&
    player.lastName === 'Saravana'
  ) {
    return {
      ...player,
      lastName: 'Rajkumar',
      firstName: 'Saravana',
    };
  }

  //  Ilé Rombouts
  if (
    player.memberId === '50055780' &&
    player.firstName === 'Ile' &&
    player.lastName === 'Rombouts'
  ) {
    return {
      ...player,
      firstName: 'Ilé',
    };
  }
  //  Glenn Van der Avoort
  if (player.memberId === '50100530' && player.firstName === 'Glenn') {
    return {
      ...player,
      lastName: 'Van Der Avoort',
    };
  }

  //  Liese Vandersmissen
  if (
    player.memberId === '50076118' &&
    player.firstName === 'Liesse' &&
    player.lastName === 'Vandersmissen'
  ) {
    return {
      ...player,
      firstName: 'Liese',
    };
  }
  //  Jürgen voet
  if (player.memberId === '50082610' && player.lastName === 'Voet') {
    return {
      ...player,
      firstName: 'Jürgen',
    };
  }

  //  Jérémy Meurice
  if (
    (player.memberId === '30061213' &&
      player.firstName === 'Jeremy' &&
      player.lastName === 'Meurice') ||
    (player.memberId === '30061213' &&
      player.firstName === 'JéRéMy' &&
      player.lastName === 'Meurice')
  ) {
    return {
      ...player,
      firstName: 'Jérémy',
    };
  }

  //  François Moncel
  if (
    (player.memberId === '30007904' &&
      player.firstName === 'Francois' &&
      player.lastName === 'Moncel') ||
    (player.memberId === '30007904' &&
      player.firstName === 'FrançOis' &&
      player.lastName === 'Moncel')
  ) {
    return {
      ...player,
      firstName: 'François',
    };
  }

  //  Cécile Myster
  if (
    (player.memberId === '30039972' &&
      player.firstName === 'Cecile' &&
      player.lastName === 'Myster') ||
    (player.memberId === '30039972' &&
      player.firstName === 'CéCile' &&
      player.lastName === 'Myster')
  ) {
    return {
      ...player,
      firstName: 'Cécile',
    };
  }

  //  Donald Nagels
  if (
    player.memberId === '50894307' &&
    player.firstName === 'Donald' &&
    player.lastName === 'Naegels'
  ) {
    return {
      ...player,
      lastName: 'Nagels',
    };
  }

  //  Alisa Nazarova
  if (
    player.memberId === '50097320' &&
    player.firstName === 'Alisa' &&
    player.lastName === 'Nazanov'
  ) {
    return {
      ...player,
      lastName: 'Nazarova',
    };
  }

  //  Nia Poniyah
  if (
    player.memberId === '50053428' &&
    player.firstName === 'Poniyah' &&
    player.lastName === 'Nia'
  ) {
    return {
      ...player,
      lastName: 'Poniyah',
      firstName: 'Nia',
    };
  }

  //  Léon Nottelman
  if (
    (player.memberId === '485349' &&
      player.firstName === 'Leon' &&
      player.lastName === 'Nottelman') ||
    (player.memberId === '485349' &&
      player.firstName === 'LéOn' &&
      player.lastName === 'Nottelman')
  ) {
    return {
      ...player,
      firstName: 'Léon',
    };
  }

  //  Erik Oreel
  if (
    player.memberId === '890516' &&
    player.firstName === 'Eric' &&
    player.lastName === 'Oreel'
  ) {
    return {
      ...player,
      firstName: 'Erik',
    };
  }

  //  Henrik Ostberg
  if (
    player.memberId === '50098299' &&
    player.firstName === 'Hendrik' &&
    player.lastName === 'Ostberg'
  ) {
    return {
      ...player,
      firstName: 'Henrik',
    };
  }

  //  Luisa Pagliara
  if (
    (player.memberId === '' &&
      player.firstName === 'Luisa' &&
      player.lastName === 'Pagliara') ||
    (player.memberId === '30081368' &&
      player.firstName === 'Louisa' &&
      player.lastName === 'Pagliara')
  ) {
    return {
      ...player,
      firstName: 'Luisa',
      memberId: '30081368',
    };
  }

  //  Kilaïm Panggih Purwoko
  if (
    (player.memberId === '50100601' &&
      player.firstName === 'KilaïM' &&
      player.lastName === 'Panggih Purwoko') ||
    (player.memberId === '50100601' &&
      player.firstName === 'Kilaim' &&
      player.lastName === 'Purwoko')
  ) {
    return {
      ...player,
      firstName: 'Kilaïm',
      lastName: 'Panggih Purwoko',
    };
  }
  //  Hélène Poncelet
  if (
    player.memberId === '30028423' &&
    player.firstName === 'Helene' &&
    player.lastName === 'Poncelet'
  ) {
    return {
      ...player,
      firstName: 'HéLèNe',
    };
  }
  //  Claire Pollak
  if (
    player.memberId === '50070524' &&
    player.firstName === 'Claire' &&
    player.lastName === 'Pollack'
  ) {
    return {
      ...player,
      lastName: 'Pollak',
    };
  }

  //  Anne-Laure Proot
  if (
    player.memberId === '50089329' &&
    player.firstName === 'Anne Laure' &&
    player.lastName === 'Proot'
  ) {
    return {
      ...player,
      firstName: 'Anne-Laure',
    };
  }

  //  Quang Ham Quach
  if (
    player.memberId === '30054115' &&
    player.firstName === 'Quang   Ham' &&
    player.lastName === 'Quach'
  ) {
    return {
      ...player,
      firstName: 'Quang Ham',
    };
  }

  //  François Quirynen
  if (
    (player.memberId === '30054501' &&
      player.firstName === 'Francois' &&
      player.lastName === 'Quirynen') ||
    (player.memberId === '30054501' &&
      player.firstName === 'FrançOis' &&
      player.lastName === 'Quirynen')
  ) {
    return {
      ...player,
      firstName: 'François',
    };
  }

  //  Rémi Rochet
  if (
    (player.memberId === '30056005' &&
      player.firstName === 'Remi' &&
      player.lastName === 'Rochet') ||
    (player.memberId === '30056005' &&
      player.firstName === 'RéMi' &&
      player.lastName === 'Rochet')
  ) {
    return {
      ...player,
      firstName: 'Rémi',
    };
  }

  //  Natalia Rubio
  if (
    player.memberId === '30087303' &&
    player.firstName === 'Nathalia' &&
    player.lastName === 'Rubio'
  ) {
    return {
      ...player,
      firstName: 'Natalia',
    };
  }

  //  Leonie Rovers
  if (
    player.memberId === '874069' &&
    player.firstName === 'Leoni' &&
    player.lastName === 'Rovers'
  ) {
    return {
      ...player,
      firstName: 'Leonie',
    };
  }

  //  Erik jr Timmerman
  if (
    player.memberId === '50000773' &&
    player.firstName === 'Erik Jr' &&
    player.lastName === 'Timmerman'
  ) {
    return {
      ...player,
      firstName: 'Erik Jr.',
    };
  }

  //  Daniel Ducat
  if (
    player.memberId === '50001633' &&
    player.firstName === 'DaniëL' &&
    player.lastName === 'Decat'
  ) {
    return {
      ...player,
      firstName: 'Daniel',
      lastName: 'Ducat',
    };
  }

  //  Dirk Brijs
  if (
    player.memberId === '50016240' &&
    player.firstName === 'Dirk' &&
    player.lastName === 'Brijs'
  ) {
    return {
      ...player,
      lastName: 'Brys',
    };
  }

  //  Koen De Nolf
  if (
    player.memberId === '50026016' &&
    player.firstName === 'Koen' &&
    player.lastName === 'Denolf'
  ) {
    return {
      ...player,
      lastName: 'De Nolf',
    };
  }

  //  Koen Claessens
  if (
    player.memberId === '' &&
    player.firstName === 'Koen' &&
    player.lastName === 'Claessens'
  ) {
    return {
      ...player,
      memberId: '50057535',
    };
  }
  //  Serge Rusak
  if (
    player.memberId === '' &&
    player.firstName === 'Serge' &&
    player.lastName === 'Rusak'
  ) {
    return {
      ...player,
      memberId: '30035358',
    };
  }

  //  Zulfiqar Ali Khan
  if (
    player.memberId === '50035126' &&
    player.firstName === 'Zulfiqar' &&
    player.lastName === 'Khan'
  ) {
    return {
      ...player,
      firstName: 'Zulfiqar Ali',
    };
  }

  //  Björn Vannieuwenhuyse
  if (player.memberId === '50038927') {
    return {
      ...player,
      firstName: 'Björn',
      lastName: 'Van Nieuwenhuyse',
    };
  }

  //  Loes Pleysier
  if (
    player.memberId === '50042047' &&
    player.firstName === 'Loes' &&
    player.lastName === 'Pleyier'
  ) {
    return {
      ...player,
      lastName: 'Pleysier',
    };
  }

  //  Bart Tourné
  if (
    player.memberId === '50047634' &&
    player.firstName === 'Bart' &&
    player.lastName === 'Tourne'
  ) {
    return {
      ...player,
      lastName: 'Tourné',
    };
  }

  //  Dries Van Dyck
  if (
    player.memberId === '50056622' &&
    player.firstName === 'Dries' &&
    player.lastName === 'Van Dijck'
  ) {
    return {
      ...player,
      lastName: 'Van Dyck',
    };
  }

  //  Mathieu Dekeyser
  if (
    player.memberId === '50057037' &&
    player.firstName === 'Dekeyser' &&
    player.lastName === 'Mathieu'
  ) {
    return {
      ...player,
      firstName: 'Mathieu',
      lastName: 'Dekeyser',
    };
  }

  //  Sylvie Wijnen
  if (
    player.memberId === '50061253' &&
    player.firstName === 'Silvie' &&
    player.lastName === 'Wijnen'
  ) {
    return {
      ...player,
      firstName: 'Sylvie',
    };
  }

  //  Annelore Buffel
  if (
    player.memberId === '50070821' &&
    player.firstName === 'Hannelore' &&
    player.lastName === 'Buffel'
  ) {
    return {
      ...player,
      firstName: 'Annelore',
    };
  }

  //  Charlot Philips
  if (
    player.memberId === '50071046' &&
    player.firstName === 'Charlotte' &&
    player.lastName === 'Philips'
  ) {
    return {
      ...player,
      firstName: 'Charlot',
    };
  }

  //  Axel Vanoirbeek
  if (
    player.memberId === '50074397' &&
    player.firstName === 'Axel' &&
    player.lastName === 'Van Oirbeek'
  ) {
    return {
      ...player,
      lastName: 'Vanoirbeek',
    };
  }

  //  Pieter De Bleeckere
  if (
    player.memberId === '50075806' &&
    player.firstName === 'De Bleeckere' &&
    player.lastName === 'Pieter'
  ) {
    return {
      ...player,
      firstName: 'Pieter',
      lastName: 'De Bleeckere',
    };
  }

  //  Stéphanie Vackier
  if (
    player.memberId === '50080085' &&
    player.firstName === 'Stephanie' &&
    player.lastName === 'Vackier'
  ) {
    return {
      ...player,
      firstName: 'StéPhanie',
    };
  }

  //  Sven Vanhulle
  if (
    player.memberId === '50080311' &&
    player.firstName === 'Sven' &&
    player.lastName === 'Van Hulle'
  ) {
    return {
      ...player,
      lastName: 'Vanhulle',
    };
  }

  //  Lieselot De Bleeckere
  if (
    player.memberId === '50083838' &&
    player.firstName === 'De Bleeckere' &&
    player.lastName === 'Lieselot'
  ) {
    return {
      ...player,
      firstName: 'Lieselot',
      lastName: 'De Bleeckere',
    };
  }

  //  Dianika Lestari
  if (
    player.memberId === '50085065' &&
    player.firstName === 'Diane' &&
    player.lastName === 'Lestari'
  ) {
    return {
      ...player,
      lastName: 'Dianika',
    };
  }

  //  Lobke Van Den Berg
  if (
    player.memberId === '50085168' &&
    player.firstName === 'Van Den Berg' &&
    player.lastName === 'Lobke'
  ) {
    return {
      ...player,
      firstName: 'Lobke',
      lastName: 'Van Den Berg',
    };
  }

  //  Wouter Vandekinderen
  if (
    player.memberId === '50085383' &&
    player.firstName === 'Wouter' &&
    player.lastName === 'Van De Kinderen'
  ) {
    return {
      ...player,
      lastName: 'Vandekinderen',
    };
  }

  //  Noel Maes
  if (
    player.memberId === '50085646' &&
    player.firstName === 'NoëL' &&
    player.lastName === 'Maes'
  ) {
    return {
      ...player,
      firstName: 'Noel',
    };
  }

  //  Céline Goole
  if (
    player.memberId === '50085813' &&
    player.firstName === 'Celine' &&
    player.lastName === 'Goole'
  ) {
    return {
      ...player,
      firstName: 'CéLine',
    };
  }

  //  Lies Maris
  if (
    player.memberId === '50088093' &&
    player.firstName === 'Annelies' &&
    player.lastName === 'Maris'
  ) {
    return {
      ...player,
      firstName: 'Lies',
    };
  }

  //  Jordi Voeten
  if (
    player.memberId === '50089286' &&
    player.firstName === 'Jordy' &&
    player.lastName === 'Voeten'
  ) {
    return {
      ...player,
      firstName: 'Jordi',
    };
  }

  //  Bart De Graeve
  if (
    player.memberId === '50090318' &&
    player.firstName === 'Bart' &&
    player.lastName === 'Degraeve'
  ) {
    return {
      ...player,
      lastName: 'De Graeve',
    };
  }

  //  Beatrice Lintermans
  if (
    player.memberId === '50094749' &&
    player.firstName === 'BéA' &&
    player.lastName === 'Lintermans'
  ) {
    return {
      ...player,
      firstName: 'Beatrice',
    };
  }

  //  Gust Vandecandelaere
  if (
    player.memberId === '50095845' &&
    player.firstName === 'Gust' &&
    player.lastName === 'Vandecandelare'
  ) {
    return {
      ...player,
      lastName: 'Vandecandelaere',
    };
  }

  //  Shashvat Shah
  if (
    player.memberId === '50097074' &&
    player.firstName === 'Shah' &&
    player.lastName === 'Shashvat'
  ) {
    return {
      ...player,
      firstName: 'Shashvat',
      lastName: 'Shash',
    };
  }

  //  Stéphan Vancaster
  if (
    player.memberId === '50099871' &&
    player.firstName === 'Stephan' &&
    player.lastName === 'Vancaster'
  ) {
    return {
      ...player,
      firstName: 'StéPhan',
    };
  }

  //  Yannick Van Haver
  if (
    player.memberId === '50100062' &&
    player.firstName === 'Yannick' &&
    player.lastName === 'Vanhaver'
  ) {
    return {
      ...player,
      lastName: 'Van Haver',
    };
  }

  //  Nicolas Van Den Branden
  if (
    player.memberId === '50100887' &&
    player.firstName === 'Van Den Branden' &&
    player.lastName === 'Nicolas'
  ) {
    return {
      ...player,
      firstName: 'Nicolas',
      lastName: 'Van Den Branden',
    };
  }

  //  Pieter Janseghers
  if (
    player.memberId === '50103036' &&
    player.firstName === 'Pieter' &&
    player.lastName === 'Jansegers'
  ) {
    return {
      ...player,
      lastName: 'Janseghers',
    };
  }

  //  Tine Janseghers
  if (
    player.memberId === '50103038' &&
    player.firstName === 'Tine' &&
    player.lastName === 'Jansegers'
  ) {
    return {
      ...player,
      lastName: 'Janseghers',
    };
  }

  //  Jan asberg
  if (
    player.memberId === '50104874' &&
    player.firstName === 'Jan' &&
    player.lastName === 'Asberg'
  ) {
    return {
      ...player,
      lastName: 'åSberg',
    };
  }

  //  Christel Vannoppen
  if (
    player.memberId === '50109209' &&
    player.firstName === 'Christel' &&
    player.lastName === 'Vanoppen'
  ) {
    return {
      ...player,
      lastName: 'Vannoppen',
    };
  }

  //  Cédric Schellekens
  if (
    player.memberId === '50110563' &&
    player.firstName === 'Cedric' &&
    player.lastName === 'Schellekens'
  ) {
    return {
      ...player,
      firstName: 'CéDric',
    };
  }

  //  Toon Van Dael
  if (
    player.memberId === '50112199' &&
    player.firstName === 'Toon' &&
    player.lastName === 'Vandael'
  ) {
    return {
      ...player,
      lastName: 'Van Dael',
    };
  }

  //  Eli Vanlerberghe
  if (
    player.memberId === '50112714' &&
    player.firstName === 'Eli' &&
    player.lastName === 'Vanlenberghe'
  ) {
    return {
      ...player,
      lastName: 'Vanlerberghe',
    };
  }

  // LéA Genson
  if (
    player.memberId === '1100' &&
    player.firstName === 'LéA' &&
    player.lastName === 'Genson'
  ) {
    return {
      ...player,
      firstName: 'Lea',
    };
  }

  // GáBor SzentpéTeri
  if (
    player.memberId === '88917' &&
    player.firstName === 'GáBor' &&
    player.lastName === 'SzentpéTeri'
  ) {
    return {
      ...player,
      firstName: 'Gabor',
    };
  }

  // Jeroen Rinderstma
  if (
    player.memberId === '523060' &&
    player.firstName === 'Jeroen' &&
    player.lastName === 'Rinderstma'
  ) {
    return {
      ...player,
      lastName: 'Rindertsma',
    };
  }

  // Dirkjan Slijkoord
  if (
    player.memberId === '539953' &&
    player.firstName === 'Dirkjan' &&
    player.lastName === 'Slijkoord'
  ) {
    return {
      ...player,
      firstName: 'Dirk Jan',
    };
  }

  // Sanne Custers-Meijers
  if (
    player.memberId === '592353' &&
    player.firstName === 'Sanne' &&
    player.lastName === 'Custers-Meijers'
  ) {
    return {
      ...player,
      lastName: 'Meijers',
    };
  }

  // Angelique Hoogstate De Vos
  if (
    player.memberId === '813217' &&
    player.firstName === 'Angelique' &&
    player.lastName === 'Hoogstate De Vos'
  ) {
    return {
      ...player,
      lastName: 'De Vos',
    };
  }

  // Angelique Hoogstrate - De Vos
  if (
    player.memberId === '813217' &&
    player.firstName === 'Angelique' &&
    player.lastName === 'Hoogstrate - De Vos'
  ) {
    return {
      ...player,
      lastName: 'De Vos',
    };
  }

  // Evelien Straaijer
  if (
    player.memberId === '813749' &&
    player.firstName === 'Evelien' &&
    player.lastName === 'Straaijer'
  ) {
    return {
      ...player,
      firstName: 'Eveline',
    };
  }

  // Levy Mathieu
  if (
    player.memberId === '30003453' &&
    player.firstName === 'Levy' &&
    player.lastName === 'Mathieu'
  ) {
    return {
      ...player,
      firstName: 'LéVy',
    };
  }

  // Valery Grotte
  if (
    player.memberId === '30004574' &&
    player.firstName === 'Valery' &&
    player.lastName === 'Grotte'
  ) {
    return {
      ...player,
      lastName: 'Grote',
    };
  }

  // Jean  Francois Lagasse
  if (
    player.memberId === '30017529' &&
    player.firstName === 'Jean  Francois' &&
    player.lastName === 'Lagasse'
  ) {
    return {
      ...player,
      firstName: 'Jean-FrançOis',
    };
  }

  // Didier Sacre
  if (
    player.memberId === '30020393' &&
    player.firstName === 'Didier' &&
    player.lastName === 'Sacre'
  ) {
    return {
      ...player,
      lastName: 'Sacré',
    };
  }

  // Amelie Pierre
  if (
    player.memberId === '30021882' &&
    player.firstName === 'Amelie' &&
    player.lastName === 'Pierre'
  ) {
    return {
      ...player,
      firstName: 'AméLie',
    };
  }

  // BenoîT Tielmance
  if (
    player.memberId === '30022519' &&
    player.firstName === 'BenoîT' &&
    player.lastName === 'Tielmance'
  ) {
    return {
      ...player,
      firstName: 'Benoit',
    };
  }

  // Benoit Lefevre
  if (
    player.memberId === '30026092' &&
    player.firstName === 'Benoit' &&
    player.lastName === 'Lefevre'
  ) {
    return {
      ...player,
      firstName: 'BenoîT',
      lastName: 'LefèVre',
    };
  }

  // Stephanie Gerard
  if (
    player.memberId === '30027712' &&
    player.firstName === 'Stephanie' &&
    player.lastName === 'Gerard'
  ) {
    return {
      ...player,
      firstName: 'StéPhanie',
      lastName: 'GéRard',
    };
  }

  // Pierre  Manuel Wauthier
  if (player.memberId === '30028879') {
    return {
      ...player,
      firstName: 'Pierre-Manuel',
      lastName: 'Wauthier',
    };
  }

  // Jean  Benoit Verbeke
  if (
    player.memberId === '30030887' &&
    player.firstName === 'Jean  Benoit' &&
    player.lastName === 'Verbeke'
  ) {
    return {
      ...player,
      firstName: 'Jean-Benoit',
      lastName: 'Verbeke',
    };
  }

  // Stephane Martinage
  if (
    player.memberId === '30032619' &&
    player.firstName === 'Stephane' &&
    player.lastName === 'Martinage'
  ) {
    return {
      ...player,
      firstName: 'StéPhane',
    };
  }

  // EléOnore Trepant
  if (
    player.memberId === '30033241' &&
    player.firstName === 'EléOnore' &&
    player.lastName === 'Trepant'
  ) {
    return {
      ...player,
      firstName: 'Eleonore',
    };
  }

  // Lejoint Amaury
  if (
    player.memberId === '30034823' &&
    player.firstName === 'Lejoint' &&
    player.lastName === 'Amaury'
  ) {
    return {
      ...player,
      firstName: 'Amaury',
      lastName: 'Lejoint',
    };
  }

  // Christopher Witgens
  if (
    player.memberId === '30038053' &&
    player.firstName === 'Christopher' &&
    player.lastName === 'Witgens'
  ) {
    return {
      ...player,
      lastName: 'Wintgens',
    };
  }

  // Cedric Batsle
  if (
    player.memberId === '30038192' &&
    player.firstName === 'Cedric' &&
    player.lastName === 'Batsle'
  ) {
    return {
      ...player,
      firstName: 'CéDric',
    };
  }

  // Pierre-Yves GéRard
  if (
    player.memberId === '30039140' &&
    player.firstName === 'Pierre-Yves' &&
    player.lastName === 'GéRard'
  ) {
    return {
      ...player,
      lastName: 'Gerard',
    };
  }

  // Pierre  Yves Soille
  if (
    player.memberId === '30043113' &&
    player.firstName === 'Pierre  Yves' &&
    player.lastName === 'Soille'
  ) {
    return {
      ...player,
      firstName: 'Pierre-Yves',
    };
  }

  // AuréLie Deblandre
  if (
    player.memberId === '30044089' &&
    player.firstName === 'AuréLie' &&
    player.lastName === 'Deblandre'
  ) {
    return {
      ...player,
      firstName: 'Aurelie',
    };
  }

  // Maite Wouters
  if (
    player.memberId === '30046220' &&
    player.firstName === 'Maite' &&
    player.lastName === 'Wouters'
  ) {
    return {
      ...player,
      firstName: 'MaïTé',
    };
  }

  // Gregoire Gosin
  if (
    player.memberId === '30047443' &&
    player.firstName === 'Gregoire' &&
    player.lastName === 'Gosin'
  ) {
    return {
      ...player,
      firstName: 'GréGoire',
    };
  }

  // Selena Kaye
  if (player.memberId === '30052363') {
    return {
      ...player,
      firstName: 'Séléna',
    };
  }

  // Stephanie Tuerlinckx
  if (
    player.memberId === '30053891' &&
    player.firstName === 'Stephanie' &&
    player.lastName === 'Tuerlinckx'
  ) {
    return {
      ...player,
      firstName: 'Stéphanie',
    };
  }

  // Boune Ratsamy
  if (
    player.memberId === '30053996' &&
    player.firstName === 'Boune' &&
    player.lastName === 'Ratsamy'
  ) {
    return {
      ...player,
      firstName: 'Som Boune',
    };
  }

  // Alberic De Coster
  if (player.memberId === '30054627') {
    return {
      ...player,
      firstName: 'Albéric',
      lastName: 'De Coster',
    };
  }

  // Aurelien Vermylen
  if (
    player.memberId === '30056330' &&
    player.firstName === 'Aurelien' &&
    player.lastName === 'Vermylen'
  ) {
    return {
      ...player,
      firstName: 'AuréLien',
    };
  }

  // StéPhane Vannitsen
  if (
    player.memberId === '30056343' &&
    player.firstName === 'StéPhane' &&
    player.lastName === 'Vannitsen'
  ) {
    return {
      ...player,
      lastName: 'Vannitsem',
    };
  }

  // Isaac LéOnard
  if (
    player.memberId === '30061211' &&
    player.firstName === 'Isaac' &&
    player.lastName === 'LéOnard'
  ) {
    return {
      ...player,
      lastName: 'Leonard',
    };
  }

  // Klels Adrien
  if (
    player.memberId === '30062249' &&
    player.firstName === 'Klels' &&
    player.lastName === 'Adrien'
  ) {
    return {
      ...player,
      firstName: 'Adrien',
      lastName: 'Klels',
    };
  }

  // Antoine Docquier
  if (
    player.memberId === '30062852' &&
    player.firstName === 'Antoine' &&
    player.lastName === 'Docquier'
  ) {
    return {
      ...player,
      lastName: 'Dockier',
    };
  }

  // Nathalia Jasik
  if (
    player.memberId === '30063170' &&
    player.firstName === 'Nathalia' &&
    player.lastName === 'Jasik'
  ) {
    return {
      ...player,
      firstName: 'Natalia',
    };
  }

  // Wang Ting Ting
  if (
    player.memberId === '30063557' &&
    player.firstName === 'Wang' &&
    player.lastName === 'Ting Ting'
  ) {
    return {
      ...player,
      firstName: 'Ting Ting',
      lastName: 'Wang',
    };
  }

  // Armand Frameree
  if (
    player.memberId === '30065484' &&
    player.firstName === 'Armand' &&
    player.lastName === 'Frameree'
  ) {
    return {
      ...player,
      lastName: 'Fameree',
    };
  }

  // Lucas Jorrissen
  if (
    player.memberId === '30069214' &&
    player.firstName === 'Lucas' &&
    player.lastName === 'Jorrissen'
  ) {
    return {
      ...player,
      lastName: 'Jorissen',
    };
  }

  // Gilis Thomas
  if (
    player.memberId === '30069334' &&
    player.firstName === 'Gilis' &&
    player.lastName === 'Thomas'
  ) {
    return {
      ...player,
      firstName: 'Thomas',
      lastName: 'Gilis',
    };
  }

  // Vervier Sarah
  if (
    player.memberId === '30070106' &&
    player.firstName === 'Vervier' &&
    player.lastName === 'Sarah'
  ) {
    return {
      ...player,
      firstName: 'Sarah',
      lastName: 'Vervier',
    };
  }

  // Kilian Mine
  if (
    player.memberId === '30070837' &&
    player.firstName === 'Kilian' &&
    player.lastName === 'Mine'
  ) {
    return {
      ...player,
      firstName: 'Killian',
    };
  }

  // Aymane Zaki
  if (
    player.memberId === '30073630' &&
    player.firstName === 'Aymane' &&
    player.lastName === 'Zaki'
  ) {
    return {
      ...player,
      lastName: 'Zaihi',
    };
  }

  // JéRéMy Giltaire
  if (
    player.memberId === '30075748' &&
    player.firstName === 'JéRéMy' &&
    player.lastName === 'Giltaire'
  ) {
    return {
      ...player,
      firstName: 'Jeremy',
    };
  }

  // Hannah Koe N Gono
  if (
    player.memberId === '30078704' &&
    player.firstName === 'Hannah' &&
    player.lastName === 'Koe N Gono'
  ) {
    return {
      ...player,
      firstName: 'Hannah-Gabrielle',
    };
  }

  // Eymen Zararsiz
  if (
    player.memberId === '30078949' &&
    player.firstName === 'Eymen' &&
    player.lastName === 'Zararsiz'
  ) {
    return {
      ...player,
      lastName: 'Zararsik',
    };
  }

  // Maximilien Whitof
  if (
    player.memberId === '30079665' &&
    player.firstName === 'Maximilien' &&
    player.lastName === 'Whitof'
  ) {
    return {
      ...player,
      lastName: 'Withof',
    };
  }

  // Pierre Serge
  if (
    player.memberId === '30079890' &&
    player.firstName === 'Pierre' &&
    player.lastName === 'Serge'
  ) {
    return {
      ...player,
      lastName: 'Segers',
    };
  }

  // Rose Gulbin Kocak
  if (
    player.memberId === '30080660' &&
    player.firstName === 'Rose Gulbin' &&
    player.lastName === 'Kocak'
  ) {
    return {
      ...player,
      firstName: 'Rose',
    };
  }

  // Carroll Elliot
  if (
    player.memberId === '30082851' &&
    player.firstName === 'Carroll' &&
    player.lastName === 'Elliot'
  ) {
    return {
      ...player,
      firstName: 'Elliot',
      lastName: 'Carroll',
    };
  }

  // AnaïS Leveaux
  if (
    player.memberId === '30084608' &&
    player.firstName === 'AnaïS' &&
    player.lastName === 'Leveaux'
  ) {
    return {
      ...player,
      lastName: 'Levaux',
    };
  }

  // Ophelie Buntinx
  if (
    player.memberId === '30084731' &&
    player.firstName === 'Ophelie' &&
    player.lastName === 'Buntinx'
  ) {
    return {
      ...player,
      firstName: 'Ophélie',
    };
  }

  // Victor Standaert
  if (
    player.memberId === '30088517' &&
    player.firstName === 'Victor' &&
    player.lastName === 'Standaert'
  ) {
    return {
      ...player,
      lastName: 'Standard',
    };
  }

  // Sasha Juchelka
  if (
    player.memberId === '30096325' &&
    player.firstName === 'Sasha' &&
    player.lastName === 'Juchelka'
  ) {
    return {
      ...player,
      firstName: 'Sacha',
    };
  }

  // Line Xia Ruoya
  if (
    player.memberId === '30099095' &&
    player.firstName === 'Line' &&
    player.lastName === 'Xia Ruoya'
  ) {
    return {
      ...player,
      lastName: 'Xia',
    };
  }

  // SöRen Lowie
  if (
    player.memberId === '50113368' &&
    player.firstName === 'SöRen' &&
    player.lastName === 'Lowie'
  ) {
    return {
      ...player,
      firstName: 'Sören',
    };
  }

  // Lowie SöRen
  if (
    player.memberId === '50113368' &&
    player.firstName === 'Lowie' &&
    player.lastName === 'SöRen'
  ) {
    return {
      ...player,
      firstName: 'Sören',
      lastName: 'Lowie',
    };
  }

  // Boss Phatthanaphong
  if (
    player.memberId === '50115219' &&
    player.firstName === 'Boss' &&
    player.lastName === 'Phatthanaphong'
  ) {
    return {
      ...player,
      firstName: 'Rupchang',
    };
  }

  // Birgit Van Acker
  if (
    player.memberId === '50115980' &&
    player.firstName === 'Birgit' &&
    player.lastName === 'Van Acker'
  ) {
    return {
      ...player,
      lastName: 'Van Ackere',
    };
  }

  // Myrthe Van Parys
  if (
    player.memberId === '50116104' &&
    player.firstName === 'Myrthe' &&
    player.lastName === 'Van Parys'
  ) {
    return {
      ...player,
      firstName: 'Mirthe',
    };
  }

  // Maelle Salmon
  if (
    player.memberId === '50116292' &&
    player.firstName === 'Maelle' &&
    player.lastName === 'Salmon'
  ) {
    return {
      ...player,
      firstName: 'Maëlle',
    };
  }

  // MaëLle Salmon
  if (
    player.memberId === '50116292' &&
    player.firstName === 'MaëLle' &&
    player.lastName === 'Salmon'
  ) {
    return {
      ...player,
      firstName: 'Maëlle',
    };
  }

  // Delsaert Lotte
  if (
    player.memberId === '50121383' &&
    player.firstName === 'Delsaert' &&
    player.lastName === 'Lotte'
  ) {
    return {
      ...player,
      firstName: 'Lotte',
      lastName: 'Delsaert',
    };
  }

  // Robbe Brees
  if (
    player.memberId === '50130927' &&
    player.firstName === 'Robbe' &&
    player.lastName === 'Brees'
  ) {
    return {
      ...player,
      memberId: '50103721',
    };
  }

  // Mayil Vahanen
  if (
    player.memberId === '50153536' &&
    player.firstName === 'Mayil' &&
    player.lastName === 'Vahanen'
  ) {
    return {
      ...player,
      lastName: 'Vahanan',
    };
  }

  // Margot Tuyvaerts
  if (
    player.memberId === '50192108' &&
    player.firstName === 'Margot' &&
    player.lastName === 'Tuyvaerts'
  ) {
    return {
      ...player,
      lastName: 'Tuyaerts',
    };
  }

  // Sarkar Suvankar
  if (
    player.memberId === '50204378' &&
    player.firstName === 'Sarkar' &&
    player.lastName === 'Suvankar'
  ) {
    return {
      ...player,
      firstName: 'Suvankar',
      lastName: 'Sarkar',
    };
  }

  // Ciscato Adrian
  if (
    player.memberId === '50261126' &&
    player.firstName === 'Ciscato' &&
    player.lastName === 'Adrian'
  ) {
    return {
      ...player,
      firstName: 'Adrian',
      lastName: 'Ciscato',
    };
  }

  // Naveen Ale
  if (
    player.memberId === '50274201' &&
    player.firstName === 'Naveen' &&
    player.lastName === 'Ale'
  ) {
    return {
      ...player,
      firstName: 'Ale',
      lastName: 'Naveen',
    };
  }

  // Azeem Fowad Shahid
  if (
    player.memberId === '50307193' &&
    player.firstName === 'Azeem Fowad' &&
    player.lastName === 'Shahid'
  ) {
    return {
      ...player,
      firstName: 'Azeem Fawad',
    };
  }

  // Kumar Vivek
  if (
    player.memberId === '50312138' &&
    player.firstName === 'Kumar' &&
    player.lastName === 'Vivek'
  ) {
    return {
      ...player,
      firstName: 'Vivek',
      lastName: 'Kumar',
    };
  }

  // Laszo Van Holder
  if (
    player.memberId === '50336606' &&
    player.firstName === 'Laszo' &&
    player.lastName === 'Van Holder'
  ) {
    return {
      ...player,
      firstName: 'Laszlo',
    };
  }

  // Thonisone Saimpholphakdy
  if (
    player.memberId === '50346970' &&
    player.firstName === 'Thonisone' &&
    player.lastName === 'Saimpholphakdy'
  ) {
    return {
      ...player,
      firstName: 'Thanisone',
    };
  }

  // Yana Wenzlauski
  if (
    player.memberId === '50402021' &&
    player.firstName === 'Yana' &&
    player.lastName === 'Wenzlauski'
  ) {
    return {
      ...player,
      lastName: 'Wenzlawski',
    };
  }

  // Stefaan Herderweirt
  if (
    player.memberId === '50478672' &&
    player.firstName === 'Stefaan' &&
    player.lastName === 'Herderweirt'
  ) {
    return {
      ...player,
      lastName: 'Helderweirt',
    };
  }

  // Evelien Kempes
  if (
    player.memberId === '50481312' &&
    player.firstName === 'Evelien' &&
    player.lastName === 'Kempes'
  ) {
    return {
      ...player,
      lastName: 'Kempkes',
    };
  }

  // Po Liu Wan
  if (
    player.memberId === '50487671' &&
    player.firstName === 'Po' &&
    player.lastName === 'Liu Wan'
  ) {
    return {
      ...player,
      firstName: 'Wan Po',
      lastName: 'Liu',
    };
  }

  // Mirthe Higgins
  if (
    player.memberId === '50495186' &&
    player.firstName === 'Mirthe' &&
    player.lastName === 'Higgins'
  ) {
    return {
      ...player,
      firstName: 'Myrthe',
    };
  }

  // Tim Peirlynck
  if (
    player.memberId === '50529986' &&
    player.firstName === 'Tim' &&
    player.lastName === 'Peirlynck'
  ) {
    return {
      ...player,
      lastName: 'Peirlinck',
    };
  }

  // Tratsaert Nikita
  if (
    player.memberId === '50535366' &&
    player.firstName === 'Tratsaert' &&
    player.lastName === 'Nikita'
  ) {
    return {
      ...player,
      firstName: 'Nikita',
      lastName: 'Tratsaert',
    };
  }

  // Anne-Laure Heirebaut
  if (
    player.memberId === '50549537' &&
    player.firstName === 'Anne-Laure' &&
    player.lastName === 'Heirebaut'
  ) {
    return {
      ...player,
      lastName: 'Heirbaut',
    };
  }

  // Vijayabaskar Selvaraj
  if (player.memberId === '50596063') {
    return {
      ...player,
      firstName: 'Vijaya baskar',
      lastName: 'Selvaraj',
    };
  }

  // Jelle Vandessel
  if (
    player.memberId === '50605909' &&
    player.firstName === 'Jelle' &&
    player.lastName === 'Vandessel'
  ) {
    return {
      ...player,
      lastName: 'Van Dessel',
    };
  }

  // Tom Greven Donk
  if (
    player.memberId === '50630121' &&
    player.firstName === 'Tom' &&
    player.lastName === 'Greven Donk'
  ) {
    return {
      ...player,
      lastName: 'Grevendonk',
    };
  }

  // Ines Sommers
  if (
    player.memberId === '50714465' &&
    player.firstName === 'Ines' &&
    player.lastName === 'Sommers'
  ) {
    return {
      ...player,
      lastName: 'Somers',
    };
  }

  // Tim Verstraeten
  if (
    player.memberId === '50729292' &&
    player.firstName === 'Tim' &&
    player.lastName === 'Verstraeten'
  ) {
    return {
      ...player,
      lastName: 'Verstraete',
    };
  }

  // Chandana Basavarajaiah
  if (
    player.memberId === '50780131' &&
    player.firstName === 'Chandana' &&
    player.lastName === 'Basavarajaiah'
  ) {
    return {
      ...player,
      firstName: 'Basavarajaiah',
      lastName: 'Chandana',
    };
  }

  // Brit Lemmens
  if (
    player.memberId === '50836676' &&
    player.firstName === 'Brit' &&
    player.lastName === 'Lemmens'
  ) {
    return {
      ...player,
      firstName: 'Britt',
    };
  }

  // Renilde Sneyers
  if (
    player.memberId === '50932411' &&
    player.firstName === 'Renilde' &&
    player.lastName === 'Sneyers'
  ) {
    return {
      ...player,
      lastName: 'Snyers',
    };
  }

  // Lui Wanpok
  if (
    player.memberId === '50946358' &&
    player.firstName === 'Lui' &&
    player.lastName === 'Wanpok'
  ) {
    return {
      ...player,
      firstName: 'Wan Pok',
      lastName: 'Liu',
    };
  }

  // Sanaullah Safiullah
  if (
    player.memberId === '50948539' &&
    player.firstName === 'Sanaullah' &&
    player.lastName === 'Safiullah'
  ) {
    return {
      ...player,
      firstName: 'Safiullah',
      lastName: 'Sanaullah',
    };
  }

  // Vik Van Der Sijpt
  if (
    player.memberId === '50971344' &&
    player.firstName === 'Vik' &&
    player.lastName === 'Van Der Sijpt'
  ) {
    return {
      ...player,
      lastName: 'Van Der Sypt',
    };
  }

  // Monten Lindsey
  if (
    player.memberId === '50998625' &&
    player.firstName === 'Monten' &&
    player.lastName === 'Lindsey'
  ) {
    return {
      ...player,
      firstName: 'Lindsey',
      lastName: 'Monten',
    };
  }

  // Christopher Beron
  if (player.firstName === 'Chris' && player.lastName === 'Beron') {
    return {
      ...player,
      firstName: 'Christopher',
      lastName: 'Beron',
      memberId: '6461219',
    };
  }

  // Yau Dan
  if (
    player.memberId === '1297262' &&
    player.firstName === 'Yau' &&
    player.lastName === 'Dan'
  ) {
    return {
      ...player,
      firstName: 'Dan',
      lastName: 'You',
    };
  }

  // Yana Wenzlauski
  if (
    player.memberId === '50402021' &&
    player.firstName === 'Yana' &&
    player.lastName === 'Wenzlauski'
  ) {
    return {
      ...player,
      lastName: 'Wenzlawski',
    };
  }

  // Wilfried Janssen
  if (
    player.memberId === '1154272' &&
    player.firstName === 'Wilfried' &&
    player.lastName === 'Janssen'
  ) {
    return {
      ...player,
      firstName: 'Wilf',
    };
  }

  // Wilf Janssens
  if (
    player.memberId === '1154272' &&
    player.firstName === 'Wilf' &&
    player.lastName === 'Janssens'
  ) {
    return {
      ...player,
      lastName: 'Janssen',
    };
  }

  // Wang Ting Ting
  if (
    player.memberId === '30063557' &&
    player.firstName === 'Wang' &&
    player.lastName === 'Ting Ting'
  ) {
    return {
      ...player,
      firstName: 'Ting Ting',
      lastName: 'Wang',
    };
  }

  // Victoria Norris
  if (
    player.memberId === '1244126' &&
    player.firstName === 'Victoria' &&
    player.lastName === 'Norris'
  ) {
    return {
      ...player,
      firstName: 'Vicky',
    };
  }

  // Victor Standaert
  if (
    player.memberId === '30088517' &&
    player.firstName === 'Victor' &&
    player.lastName === 'Standaert'
  ) {
    return {
      ...player,
      lastName: 'Standard',
    };
  }

  // Vervier Sarah
  if (
    player.memberId === '30070106' &&
    player.firstName === 'Vervier' &&
    player.lastName === 'Sarah'
  ) {
    return {
      ...player,
      firstName: 'Sarah',
      lastName: 'Vervier',
    };
  }

  // Valery Grotte
  if (
    player.memberId === '30004574' &&
    player.firstName === 'Valery' &&
    player.lastName === 'Grotte'
  ) {
    return {
      ...player,
      lastName: 'Grote',
    };
  }

  // Usamah Hussain
  if (
    player.memberId === '1340752' &&
    player.firstName === 'Usamah' &&
    player.lastName === 'Hussain'
  ) {
    return {
      ...player,
      firstName: 'Usamah Ali',
      lastName: 'Hussain',
    };
  }

  // Tratsaert Nikita
  if (
    player.memberId === '50535366' &&
    player.firstName === 'Tratsaert' &&
    player.lastName === 'Nikita'
  ) {
    return {
      ...player,
      firstName: 'Nikita',
      lastName: 'Tratsaert',
    };
  }

  // Tomas Lowry
  if (
    player.memberId === '1318117' &&
    player.firstName === 'Tomas' &&
    player.lastName === 'Lowry'
  ) {
    return {
      ...player,
      firstName: 'Thomas',
      lastName: 'Lowry',
    };
  }

  // Tom Greven Donk
  if (
    player.memberId === '50630121' &&
    player.firstName === 'Tom' &&
    player.lastName === 'Greven Donk'
  ) {
    return {
      ...player,
      lastName: 'Grevendonk',
    };
  }

  // Tom Ellis
  if (
    player.memberId === '1290946' &&
    player.firstName === 'Tom' &&
    player.lastName === 'Ellis'
  ) {
    return {
      ...player,
      firstName: 'Thomas',
      lastName: 'Ellis',
    };
  }

  // Tjioe Lilièn
  if (
    player.memberId === '809295' &&
    player.firstName === 'Tjioe' &&
    player.lastName === 'Lilièn'
  ) {
    return {
      ...player,
      firstName: 'Lilièn',
      lastName: 'Tjioe',
    };
  }

  // Timms Ben
  if (
    player.memberId === '1236607' &&
    player.firstName === 'Timms' &&
    player.lastName === 'Ben'
  ) {
    return {
      ...player,
      firstName: 'Ben',
      lastName: 'Timms',
    };
  }

  // Tim Verstraeten
  if (
    player.memberId === '50729292' &&
    player.firstName === 'Tim' &&
    player.lastName === 'Verstraeten'
  ) {
    return {
      ...player,
      lastName: 'Verstraete',
    };
  }

  // Tim Peirlynck
  if (
    player.memberId === '50529986' &&
    player.firstName === 'Tim' &&
    player.lastName === 'Peirlynck'
  ) {
    return {
      ...player,
      lastName: 'Peirlinck',
    };
  }

  // Thonisone Saimpholphakdy
  if (
    player.memberId === '50346970' &&
    player.firstName === 'Thonisone' &&
    player.lastName === 'Saimpholphakdy'
  ) {
    return {
      ...player,
      firstName: 'Thanisone',
      lastName: 'Soumpholphakdy',
    };
  }

  // Thomas Burdett
  if (
    player.memberId === '1181973' &&
    player.firstName === 'Thomas' &&
    player.lastName === 'Burdett'
  ) {
    return {
      ...player,
      firstName: 'Tom',
    };
  }

  // Theophile Vicart
  if (
    player.memberId === '6899637' &&
    player.firstName === 'Theophile' &&
    player.lastName === 'Vicart'
  ) {
    return {
      ...player,
      firstName: 'Théophile',
      lastName: 'Vicart',
    };
  }

  // Talia Bonanno
  if (
    player.memberId === '6750331' &&
    player.firstName === 'Talia' &&
    player.lastName === 'Bonanno'
  ) {
    return {
      ...player,
      firstName: 'Talia',
      lastName: 'Bonnano',
    };
  }

  // Suvankar Sarkar
  if (
    player.memberId === '50204378' &&
    player.firstName === 'Suvankar' &&
    player.lastName === 'Sarkar'
  ) {
    return {
      ...player,
      firstName: 'Sarkar',
      lastName: 'Suvankar',
    };
  }

  // Stephanie Tuerlinckx
  if (
    player.memberId === '30053891' &&
    player.firstName === 'Stephanie' &&
    player.lastName === 'Tuerlinckx'
  ) {
    return {
      ...player,
      firstName: 'Stéphanie',
    };
  }

  // Stephanie Gerard
  if (
    player.memberId === '30027712' &&
    player.firstName === 'Stephanie' &&
    player.lastName === 'Gerard'
  ) {
    return {
      ...player,
      firstName: 'Stéphanie',
      lastName: 'Gérard',
    };
  }

  // Stéphane Vannitsen
  if (
    player.memberId === '30056343' &&
    player.firstName === 'Stéphane' &&
    player.lastName === 'Vannitsen'
  ) {
    return {
      ...player,
      firstName: 'Stéphane',
      lastName: 'Vannitsem',
    };
  }

  // Stefaan Herderweirt
  if (
    player.memberId === '50478672' &&
    player.firstName === 'Stefaan' &&
    player.lastName === 'Herderweirt'
  ) {
    return {
      ...player,
      lastName: 'Helderweirt',
    };
  }

  // Shashvat Shash
  if (
    player.memberId === '50097074' &&
    player.firstName === 'Shashvat' &&
    player.lastName === 'Shash'
  ) {
    return {
      ...player,
      lastName: 'Shah',
    };
  }

  // Serve Peulen
  if (
    player.memberId === '804862' &&
    player.firstName === 'Serve' &&
    player.lastName === 'Peulen'
  ) {
    return {
      ...player,
      firstName: 'Servé',
    };
  }

  // Sanne Custers-Meijers
  if (
    player.memberId === '592353' &&
    player.firstName === 'Sanne' &&
    player.lastName === 'Custers-Meijers'
  ) {
    return {
      ...player,
      firstName: 'Sanne',
      lastName: 'Meijers',
    };
  }

  // Samuel Shepherd
  if (
    player.memberId === '1230660' &&
    player.firstName === 'Samuel' &&
    player.lastName === 'Shepherd'
  ) {
    return {
      ...player,
      firstName: 'Sam',
    };
  }

  // Sam Dewaegenare
  if (
    player.memberId === '50987119' &&
    player.firstName === 'Sam' &&
    player.lastName === 'Dewaegenare'
  ) {
    return {
      ...player,
      lastName: 'Dewaegenaere',
    };
  }

  // Safiullah Sanaullah
  if (
    player.memberId === '50948539' &&
    player.firstName === 'Safiullah' &&
    player.lastName === 'Sanaullah'
  ) {
    return {
      ...player,
      firstName: 'Sanaullah',
      lastName: 'Safiullah',
    };
  }

  // Sacha Juchelka
  if (
    player.memberId === '30096325' &&
    player.firstName === 'Sacha' &&
    player.lastName === 'Juchelka'
  ) {
    return {
      ...player,
      firstName: 'Sasha',
    };
  }

  // Ruth Le Fevre
  if (
    player.memberId === '1247800' &&
    player.firstName === 'Ruth' &&
    player.lastName === 'Le Fevre'
  ) {
    return {
      ...player,
      firstName: 'Ruth',
      lastName: 'Le-Fevre',
    };
  }

  // Rose Kocak
  if (
    player.memberId === '30080660' &&
    player.firstName === 'Rose' &&
    player.lastName === 'Kocak'
  ) {
    return {
      ...player,
      firstName: 'Rose Gulbin',
      lastName: 'Kocak',
    };
  }

  // Ritzen Beau
  if (
    player.memberId === '863754' &&
    player.firstName === 'Ritzen' &&
    player.lastName === 'Beau'
  ) {
    return {
      ...player,
      firstName: 'Beau',
      lastName: 'Ritzen',
    };
  }

  // Renilde Sneyers
  if (
    player.memberId === '50932411' &&
    player.firstName === 'Renilde' &&
    player.lastName === 'Sneyers'
  ) {
    return {
      ...player,
      lastName: 'Snyers',
    };
  }

  // Po Liu Wan
  if (
    player.memberId === '50487671' &&
    player.firstName === 'Po' &&
    player.lastName === 'Liu Wan'
  ) {
    return {
      ...player,
      firstName: 'Wan Po',
      lastName: 'Liu',
    };
  }

  // Pierre-Yves GéRard
  if (
    player.memberId === '30039140' &&
    player.firstName === 'Pierre-Yves' &&
    player.lastName === 'GéRard'
  ) {
    return {
      ...player,
      firstName: 'Pierre-Yves',
      lastName: 'Gerard',
    };
  }

  // Pierre Serge
  if (
    player.memberId === '30079890' &&
    player.firstName === 'Pierre' &&
    player.lastName === 'Serge'
  ) {
    return {
      ...player,
      lastName: 'Segers',
    };
  }

  // Pierre  Yves Soille
  if (
    player.memberId === '30043113' &&
    player.firstName === 'Pierre  Yves' &&
    player.lastName === 'Soille'
  ) {
    return {
      ...player,
      firstName: 'Pierre-Yves',
    };
  }

  // Philip Clarke
  if (player.memberId === '1251533') {
    return {
      ...player,
      firstName: 'Phil',
      lastName: 'Clarke',
    };
  }

  // Pedro Petrus Perecaya
  if (
    player.memberId === '50247123' &&
    player.firstName === 'Pedro' &&
    player.lastName === 'Petrus Perecaya'
  ) {
    return {
      ...player,
      firstName: 'Petrus',
      lastName: 'Perecaya',
    };
  }

  // Noee Delannoy
  if (
    player.memberId === '6864100' &&
    player.firstName === 'Noee' &&
    player.lastName === 'Delannoy'
  ) {
    return {
      ...player,
      firstName: 'Noée',
      lastName: 'Delannoy',
    };
  }

  // Noach Warning
  if (
    player.memberId === '13-052' &&
    player.firstName === 'Noach' &&
    player.lastName === 'Warning'
  ) {
    return {
      ...player,
      firstName: 'Noah',
      lastName: 'Warning',
    };
  }

  // Nina Fliesher
  if (
    player.memberId === '882620' &&
    player.firstName === 'Nina' &&
    player.lastName === 'Fliesher'
  ) {
    return {
      ...player,
      lastName: 'Fliescher',
    };
  }

  // Nicholson Darren
  if (
    player.memberId === '1068222' &&
    player.firstName === 'Nicholson' &&
    player.lastName === 'Darren'
  ) {
    return {
      ...player,
      firstName: 'Darren',
      lastName: 'Nicholson',
    };
  }

  // Nathan N'Guyen
  if (player.memberId === '6864095' && player.firstName === 'Nathan') {
    return {
      ...player,
      lastName: 'Nguyen',
    };
  }

  // Nathalie Yoko Genet
  if (
    player.memberId === '30031977' &&
    player.firstName === 'Nathalie Yoko' &&
    player.lastName === 'Genet'
  ) {
    return {
      ...player,
      firstName: 'Nathalie',
      lastName: 'Genet',
    };
  }

  // Nathalia Jasik
  if (
    player.memberId === '30063170' &&
    player.firstName === 'Nathalia' &&
    player.lastName === 'Jasik'
  ) {
    return {
      ...player,
      firstName: 'Natalia',
    };
  }

  // Naidoo Kesh
  if (
    player.memberId === '1145232' &&
    player.firstName === 'Naidoo' &&
    player.lastName === 'Kesh'
  ) {
    return {
      ...player,
      firstName: 'Kesh',
      lastName: 'Naidoo',
    };
  }

  // Myrthe Van Parys
  if (
    player.memberId === '50116104' &&
    player.firstName === 'Myrthe' &&
    player.lastName === 'Van Parys'
  ) {
    return {
      ...player,
      firstName: 'Mirthe',
    };
  }

  // Monten Lindsey
  if (
    player.memberId === '50998625' &&
    player.firstName === 'Monten' &&
    player.lastName === 'Lindsey'
  ) {
    return {
      ...player,
      firstName: 'Lindsey',
      lastName: 'Monten',
    };
  }

  // Mirthe Higgins
  if (
    player.memberId === '50495186' &&
    player.firstName === 'Mirthe' &&
    player.lastName === 'Higgins'
  ) {
    return {
      ...player,
      firstName: 'Myrthe',
    };
  }

  // Mike Parker
  if (
    player.memberId === '1244301' &&
    player.firstName === 'Mike' &&
    player.lastName === 'Parker'
  ) {
    return {
      ...player,
      firstName: 'Michael',
      lastName: 'Parker',
    };
  }

  // Mikael Le Grives
  if (
    player.memberId === 'FR31723' &&
    player.firstName === 'Mikael' &&
    player.lastName === 'Le Grives'
  ) {
    return {
      ...player,
      firstName: 'Mikael',
      lastName: 'Le Grivès',
    };
  }

  // Michaël De Rechter
  if (
    player.memberId === '50071454' &&
    player.firstName === 'Michaël' &&
    player.lastName === 'De Rechter'
  ) {
    return {
      ...player,
      firstName: 'Michaël',
      lastName: 'De Rechter',
    };
  }

  // Michael Bruinesse
  if (
    player.memberId === '892424' &&
    player.firstName === 'Michael' &&
    player.lastName === 'Bruinesse'
  ) {
    return {
      ...player,
      firstName: 'Michael',
      lastName: 'Van Bruinessen',
    };
  }

  // Memee Jurgen
  if (
    player.memberId === '764379' &&
    player.firstName === 'Memee' &&
    player.lastName === 'Jurgen'
  ) {
    return {
      ...player,
      firstName: 'Jurgen',
      lastName: 'Memee',
    };
  }

  // Melissa Willigen
  if (
    player.memberId === '701610' &&
    player.firstName === 'Melissa' &&
    player.lastName === 'Willigen'
  ) {
    return {
      ...player,
      firstName: 'Melissa',
      lastName: 'Van Willigen',
    };
  }

  // Meijer Bianca
  if (
    player.memberId === '729799' &&
    player.firstName === 'Meijer' &&
    player.lastName === 'Bianca'
  ) {
    return {
      ...player,
      firstName: 'Bianca',
      lastName: 'Meijer',
    };
  }

  // Mayil Vahanan
  if (
    player.memberId === '50153536' &&
    player.firstName === 'Mayil' &&
    player.lastName === 'Vahanan'
  ) {
    return {
      ...player,
      lastName: 'Vahanen',
    };
  }

  // Maximilien Whitof
  if (
    player.memberId === '30079665' &&
    player.firstName === 'Maximilien' &&
    player.lastName === 'Whitof'
  ) {
    return {
      ...player,
      lastName: 'Withof',
    };
  }

  // Matthijs Van Lelieveld
  if (
    player.memberId === '828643' &&
    player.firstName === 'Matthijs' &&
    player.lastName === 'Van Lelieveld'
  ) {
    return {
      ...player,
      firstName: 'Mathijs',
    };
  }

  // Mathijs Van Leleiveld
  if (
    player.memberId === '828643' &&
    player.firstName === 'Mathijs' &&
    player.lastName === 'Van Leleiveld'
  ) {
    return {
      ...player,
      lastName: 'Van Lelieveld',
    };
  }

  // Martyn Clarck
  if (
    player.memberId === '1008700' &&
    player.firstName === 'Martyn' &&
    player.lastName === 'Clarck'
  ) {
    return {
      ...player,
      lastName: 'Clark',
    };
  }

  // Martin Thierry
  if (
    player.memberId === '6810359' &&
    player.firstName === 'Martin' &&
    player.lastName === 'Thierry'
  ) {
    return {
      ...player,
      memberId: '06909096',
      lastName: 'Thiery',
    };
  }

  // Martin Thierry
  if (
    player.memberId === '6909096' &&
    player.firstName === 'Martin' &&
    player.lastName === 'Thiery'
  ) {
    return {
      ...player,
      memberId: '06909096',
    };
  }

  // Margot Tuyvaerts
  if (
    player.memberId === '50192108' &&
    player.firstName === 'Margot' &&
    player.lastName === 'Tuyvaerts'
  ) {
    return {
      ...player,
      lastName: 'Tuyaerts',
    };
  }

  // Maite Wouters
  if (
    player.memberId === '30046220' &&
    player.firstName === 'Maite' &&
    player.lastName === 'Wouters'
  ) {
    return {
      ...player,
      firstName: 'Maïté',
    };
  }

  // Maeve Delannoy Seillier
  if (
    player.memberId === '6817059' &&
    player.firstName === 'Maeve' &&
    player.lastName === 'Delannoy Seillier'
  ) {
    return {
      ...player,
      memberId: '6895030',
    };
  }

  // Maelle Salmon
  if (
    player.memberId === '50116292' &&
    player.firstName === 'Maelle' &&
    player.lastName === 'Salmon'
  ) {
    return {
      ...player,
      firstName: 'Maëlle',
    };
  }

  // Lui Wanpok
  if (
    player.memberId === '50946358' &&
    player.firstName === 'Lui' &&
    player.lastName === 'Wanpok'
  ) {
    return {
      ...player,
      firstName: 'Wan Pok',
      lastName: 'Liu',
    };
  }

  // Lucas Jorrissen
  if (
    player.memberId === '30069214' &&
    player.firstName === 'Lucas' &&
    player.lastName === 'Jorrissen'
  ) {
    return {
      ...player,
      lastName: 'Jorissen',
    };
  }

  // Lowie Sören
  if (
    player.memberId === '50113368' &&
    player.firstName === 'Lowie' &&
    player.lastName === 'Sören'
  ) {
    return {
      ...player,
      firstName: 'Sören',
      lastName: 'Lowie',
    };
  }

  // Louise Hugé
  if (
    player.memberId === '6696097' &&
    player.firstName === 'Louise' &&
    player.lastName === 'Hugé'
  ) {
    return {
      ...player,
      memberId: '6915603',
      lastName: 'Huge',
    };
  }

  // Loic De Leeuw
  if (
    player.memberId === '807834' &&
    player.firstName === 'Loic' &&
    player.lastName === 'De Leeuw'
  ) {
    return {
      ...player,
      firstName: 'Loïc',
    };
  }

  // Line Xia
  if (
    player.memberId === '30099095' &&
    player.firstName === 'Line' &&
    player.lastName === 'Xia'
  ) {
    return {
      ...player,
      firstName: 'Line',
      lastName: 'Xia Ruoya',
    };
  }

  // Levy Mathieu
  if (
    player.memberId === '30003453' &&
    player.firstName === 'Levy' &&
    player.lastName === 'Mathieu'
  ) {
    return {
      ...player,
      firstName: 'Lévy',
      lastName: 'Mathieu',
    };
  }

  // Lejoint Amaury
  if (
    player.memberId === '30034823' &&
    player.firstName === 'Lejoint' &&
    player.lastName === 'Amaury'
  ) {
    return {
      ...player,
      firstName: 'Amaury',
      lastName: 'Lejoint',
    };
  }

  // Lee Ka Wing
  if (
    player.memberId === '807115' &&
    player.firstName === 'Lee' &&
    player.lastName === 'Ka Wing'
  ) {
    return {
      ...player,
      firstName: 'Ka',
      lastName: 'Wing Lee',
    };
  }

  // Laszo Van Holder
  if (
    player.memberId === '50336606' &&
    player.firstName === 'Laszo' &&
    player.lastName === 'Van Holder'
  ) {
    return {
      ...player,
      firstName: 'Laszlo',
    };
  }

  // Kumar Vivek
  if (
    player.memberId === '50312138' &&
    player.firstName === 'Kumar' &&
    player.lastName === 'Vivek'
  ) {
    return {
      ...player,
      firstName: 'Vivek',
      lastName: 'Kumar',
    };
  }

  // Klels Adrien
  if (
    player.memberId === '30062249' &&
    player.firstName === 'Klels' &&
    player.lastName === 'Adrien'
  ) {
    return {
      ...player,
      firstName: 'Adrien',
      lastName: 'Klels',
    };
  }

  // Kilaïm Purwoko
  if (
    player.memberId === '50100601' &&
    player.firstName === 'Kilaïm' &&
    player.lastName === 'Purwoko'
  ) {
    return {
      ...player,
      lastName: 'Panggih Purwoko',
    };
  }

  // Kevin Van Dieen
  if (
    player.memberId === '820072' &&
    player.firstName === 'Kevin' &&
    player.lastName === 'Van Dieen'
  ) {
    return {
      ...player,
      lastName: 'Van Dieën',
    };
  }

  // Kerry Halbrook
  if (
    player.memberId === '1246969' &&
    player.firstName === 'Kerry' &&
    player.lastName === 'Halbrook'
  ) {
    return {
      ...player,
      firstName: 'Kerry',
      lastName: 'Hallbrook',
    };
  }

  // Kawing Lee
  if (player.memberId === '807115' && player.lastName === 'Lee') {
    return {
      ...player,
      firstName: 'Ka',
      lastName: 'Wing Lee',
    };
  }

  // Karryn Duggan
  if (
    player.memberId === '1107256' &&
    player.firstName === 'Karryn' &&
    player.lastName === 'Duggan'
  ) {
    return {
      ...player,
      firstName: 'Karyn',
    };
  }

  // Jurgen Gabriels
  if (
    player.memberId === '50048396' &&
    player.firstName === 'Jurgen' &&
    player.lastName === 'Gabriels'
  ) {
    return {
      ...player,
      lastName: 'Gabriëls',
    };
  }

  // Jeroen Rinderstma
  if (
    player.memberId === '523060' &&
    player.firstName === 'Jeroen' &&
    player.lastName === 'Rinderstma'
  ) {
    return {
      ...player,
      lastName: 'Rindertsma',
    };
  }

  // Jeremy Giltaire
  if (
    player.memberId === '30075748' &&
    player.firstName === 'Jeremy' &&
    player.lastName === 'Giltaire'
  ) {
    return {
      ...player,
      firstName: 'Jeremy',
      lastName: 'Giltaire',
    };
  }

  // Jelle Vandessel
  if (
    player.memberId === '50605909' &&
    player.firstName === 'Jelle' &&
    player.lastName === 'Vandessel'
  ) {
    return {
      ...player,
      lastName: 'Van Dessel',
    };
  }

  // Jean-Pierre Benjamin
  if (
    player.memberId === '30047681' &&
    player.firstName === 'Jean-Pierre' &&
    player.lastName === 'Benjamin'
  ) {
    return {
      ...player,
      firstName: 'Benjamin',
      lastName: 'Jean Pierre',
    };
  }

  // Jean  Pierre Delplanque
  if (
    player.memberId === '30034088' &&
    player.firstName === 'Jean  Pierre' &&
    player.lastName === 'Delplanque'
  ) {
    return {
      ...player,
      firstName: 'Jean-Pierre',
    };
  }

  // Jean  Francois Lagasse
  if (
    player.memberId === '30017529' &&
    player.firstName === 'Jean  Francois' &&
    player.lastName === 'Lagasse'
  ) {
    return {
      ...player,
      firstName: 'Jean-François',
      lastName: 'Lagasse',
    };
  }

  // Jean  Benoit Verbeke
  if (
    player.memberId === '30030887' &&
    player.firstName === 'Jean  Benoit' &&
    player.lastName === 'Verbeke'
  ) {
    return {
      ...player,
      firstName: 'Jean-Benoit',
      lastName: 'Verbeke',
    };
  }

  // Jamie Cooper
  if (
    player.memberId === '1299040' &&
    player.firstName === 'Jamie' &&
    player.lastName === 'Cooper'
  ) {
    return {
      ...player,
      firstName: 'James',
      lastName: 'Cooper',
    };
  }

  // Jacek Kolumbajew
  if (
    player.memberId === 'K1963' &&
    player.firstName === 'Jacek' &&
    player.lastName === 'Kolumbajew'
  ) {
    return {
      ...player,
      firstName: 'Jacek',
      lastName: 'Kołumbajew',
    };
  }

  // Isaac Léonard
  if (
    player.memberId === '30061211' &&
    player.firstName === 'Isaac' &&
    player.lastName === 'Léonard'
  ) {
    return {
      ...player,
      lastName: 'Leonard',
    };
  }

  // Ines Sommers
  if (
    player.memberId === '50714465' &&
    player.firstName === 'Ines' &&
    player.lastName === 'Sommers'
  ) {
    return {
      ...player,
      lastName: 'Somers',
    };
  }

  // Hippolyte Hautefeuile
  if (
    player.memberId === '6754119' &&
    player.firstName === 'Hippolyte' &&
    player.lastName === 'Hautefeuile'
  ) {
    return {
      ...player,
      firstName: 'Hippolyte',
      lastName: 'Hautefeuille',
    };
  }

  // Helene Ulens
  if (player.memberId === '30049299') {
    return {
      ...player,
      firstName: 'Hélène',
      lastName: 'Ulens',
    };
  }

  // Heidi Gabriels
  if (
    player.memberId === '50047802' &&
    player.firstName === 'Heidi' &&
    player.lastName === 'Gabriels'
  ) {
    return {
      ...player,
      lastName: 'Gabriëls',
    };
  }

  // Hannah Koe N Gono
  if (
    player.memberId === '30078704' &&
    player.firstName === 'Hannah' &&
    player.lastName === 'Koe N Gono'
  ) {
    return {
      ...player,
      firstName: 'Hannah-Gabrielle',
      lastName: 'Koe N Gono',
    };
  }

  // Gregoire Gosin
  if (
    player.memberId === '30047443' &&
    player.firstName === 'Gregoire' &&
    player.lastName === 'Gosin'
  ) {
    return {
      ...player,
      firstName: 'Grégoire',
      lastName: 'Gosin',
    };
  }

  // Gitta Djajawasito
  if (
    player.memberId === '859000' &&
    player.firstName === 'Gitta' &&
    player.lastName === 'Djajawasito'
  ) {
    return {
      ...player,
      firstName: 'Gita',
    };
  }

  // Gilis Thomas
  if (
    player.memberId === '30069334' &&
    player.firstName === 'Gilis' &&
    player.lastName === 'Thomas'
  ) {
    return {
      ...player,
      firstName: 'Thomas',
      lastName: 'Gilis',
    };
  }

  // Gilbert Harry
  if (
    player.memberId === '1236595' &&
    player.firstName === 'Gilbert' &&
    player.lastName === 'Harry'
  ) {
    return {
      ...player,
      firstName: 'Harry',
      lastName: 'Gilbert',
    };
  }

  // Gabriel Hoevers
  if (
    player.memberId === '759985' &&
    player.firstName === 'Gabriel' &&
    player.lastName === 'Hoevers'
  ) {
    return {
      ...player,
      firstName: 'Gabriël',
    };
  }

  // François Dusart
  if (
    player.memberId === '30060989' &&
    player.firstName === 'François' &&
    player.lastName === 'Dusart'
  ) {
    return {
      ...player,
      firstName: 'François',
      lastName: 'Dusart',
    };
  }

  // Eymen Zararsik
  if (
    player.memberId === '30078949' &&
    player.firstName === 'Eymen' &&
    player.lastName === 'Zararsik'
  ) {
    return {
      ...player,
      lastName: 'Zararsiz',
    };
  }

  // Evelien Straaijer
  if (
    player.memberId === '813749' &&
    player.firstName === 'Evelien' &&
    player.lastName === 'Straaijer'
  ) {
    return {
      ...player,
      firstName: 'Eveline',
    };
  }

  // Evelien Kempes
  if (
    player.memberId === '50481312' &&
    player.firstName === 'Evelien' &&
    player.lastName === 'Kempes'
  ) {
    return {
      ...player,
      lastName: 'Kempkes',
    };
  }

  // Ethan Oliver Dalley
  if (
    player.memberId === '1243998' &&
    player.firstName === 'Ethan' &&
    player.lastName === 'Oliver Dalley'
  ) {
    return {
      ...player,
      firstName: 'Ethan',
      lastName: 'Dalley',
    };
  }

  // Esteban Bourleau
  if (
    player.memberId === '30006052' &&
    player.firstName === 'Esteban' &&
    player.lastName === 'Bourleau'
  ) {
    return {
      ...player,
      firstName: 'Estéban',
      lastName: 'Bourleau',
    };
  }

  // éric Demay
  if (
    player.memberId === '6602425' &&
    player.firstName === 'éric' &&
    player.lastName === 'Demay'
  ) {
    return {
      ...player,
      firstName: 'Eric',
      lastName: 'Demay',
    };
  }

  // Ellen Kania
  if (
    player.memberId === '554831' &&
    player.firstName === 'Ellen' &&
    player.lastName === 'Kania'
  ) {
    return {
      ...player,
      firstName: 'Mirella',
      lastName: 'De Vijlder',
    };
  }

  // Eleonore Trepant
  if (
    player.memberId === '30033241' &&
    player.firstName === 'Eleonore' &&
    player.lastName === 'Trepant'
  ) {
    return {
      ...player,
      firstName: 'Eléonore',
      lastName: 'Trepant',
    };
  }

  // Dusan Gombos
  if (
    player.memberId === '30064028' &&
    player.firstName === 'Dusan' &&
    player.lastName === 'Gombos'
  ) {
    return {
      ...player,
      firstName: 'Dušan',
    };
  }

  // Dom Smith
  if (
    player.memberId === '1250420' &&
    player.firstName === 'Dom' &&
    player.lastName === 'Smith'
  ) {
    return {
      ...player,
      firstName: 'Dominique',
      lastName: 'Smith',
    };
  }

  // Dirkjan Slijkoord
  if (
    player.memberId === '539953' &&
    player.firstName === 'Dirkjan' &&
    player.lastName === 'Slijkoord'
  ) {
    return {
      ...player,
      firstName: 'Dirk Jan',
      lastName: 'Slijkoord',
    };
  }

  // Didier Sacre
  if (
    player.memberId === '30020393' &&
    player.firstName === 'Didier' &&
    player.lastName === 'Sacre'
  ) {
    return {
      ...player,
      firstName: 'Didier',
      lastName: 'Sacré',
    };
  }

  // Diane Dianika
  if (
    player.memberId === '50085065' &&
    player.firstName === 'Diane' &&
    player.lastName === 'Dianika'
  ) {
    return {
      ...player,
      firstName: 'Dianika',
      lastName: 'Lestari',
    };
  }

  // Denis Peters
  if (
    player.memberId === '840336' &&
    player.firstName === 'Denis' &&
    player.lastName === 'Peters'
  ) {
    return {
      ...player,
      firstName: 'Dennis',
      lastName: 'Peters',
    };
  }

  // Delsaert Lotte
  if (
    player.memberId === '50121383' &&
    player.firstName === 'Delsaert' &&
    player.lastName === 'Lotte'
  ) {
    return {
      ...player,
      firstName: 'Lotte',
      lastName: 'Delsaert',
    };
  }

  // Cristian Nauta
  if (
    player.memberId === '984597' &&
    player.firstName === 'Cristian' &&
    player.lastName === 'Nauta'
  ) {
    return {
      ...player,
      firstName: 'Christian',
    };
  }

  // Coralie Thomas
  if (
    player.memberId === '6584987' &&
    player.firstName === 'Coralie' &&
    player.lastName === 'Thomas'
  ) {
    return {
      ...player,
      memberId: '06584987',
    };
  }

  // Christopher Witgens
  if (
    player.memberId === '30038053' &&
    player.firstName === 'Christopher' &&
    player.lastName === 'Witgens'
  ) {
    return {
      ...player,
      lastName: 'Wintgens',
    };
  }

  // Christophe Lafon
  if (
    player.memberId === '5902975' &&
    player.firstName === 'Christophe' &&
    player.lastName === 'Lafon'
  ) {
    return {
      ...player,
      firstName: 'Christophe',
      lastName: 'Degroote',
    };
  }

  // Chandana Basavarajaiah
  if (
    player.memberId === '50780131' &&
    player.firstName === 'Chandana' &&
    player.lastName === 'Basavarajaiah'
  ) {
    return {
      ...player,
      firstName: 'Basavarajaiah',
      lastName: 'Chandana',
    };
  }

  // Cedric De Leeuw
  if (
    player.memberId === '50104883' &&
    player.firstName === 'Cedric' &&
    player.lastName === 'De Leeuw'
  ) {
    return {
      ...player,
      firstName: 'Cédric',
    };
  }

  // Cédric Batsle
  if (
    player.memberId === '30038192' &&
    player.firstName === 'Cédric' &&
    player.lastName === 'Batsle'
  ) {
    return {
      ...player,
      lastName: 'Batslé',
    };
  }

  // Cedric Batsle
  if (
    player.memberId === '30038192' &&
    player.firstName === 'Cedric' &&
    player.lastName === 'Batsle'
  ) {
    return {
      ...player,
      firstName: 'Cédric',
      lastName: 'Batslé',
    };
  }

  // Cecile Mabillon
  if (
    player.memberId === '6543559' &&
    player.firstName === 'Cecile' &&
    player.lastName === 'Mabillon'
  ) {
    return {
      ...player,
      firstName: 'Cécile',
      lastName: 'Mabillon',
    };
  }

  // Carroll Elliot
  if (
    player.memberId === '30082851' &&
    player.firstName === 'Carroll' &&
    player.lastName === 'Elliot'
  ) {
    return {
      ...player,
      firstName: 'Elliot',
      lastName: 'Carroll',
    };
  }

  // Brit Lemmens
  if (
    player.memberId === '50836676' &&
    player.firstName === 'Brit' &&
    player.lastName === 'Lemmens'
  ) {
    return {
      ...player,
      firstName: 'Britt',
    };
  }

  // Boune Ratsamy
  if (
    player.memberId === '30053996' &&
    player.firstName === 'Boune' &&
    player.lastName === 'Ratsamy'
  ) {
    return {
      ...player,
      firstName: 'Som Boune',
      lastName: 'Ratsamy',
    };
  }

  // Boss Phatthanaphong
  if (
    player.memberId === '50115219' &&
    player.firstName === 'Boss' &&
    player.lastName === 'Phatthanaphong'
  ) {
    return {
      ...player,
      firstName: 'Rupchang',
      lastName: 'Phatthanaphong',
    };
  }

  // Birgit Van Acker
  if (
    player.memberId === '50115980' &&
    player.firstName === 'Birgit' &&
    player.lastName === 'Van Acker'
  ) {
    return {
      ...player,
      lastName: 'Van Ackere',
    };
  }

  // Benoît Tielmance
  if (
    player.memberId === '30022519' &&
    player.firstName === 'Benoît' &&
    player.lastName === 'Tielmance'
  ) {
    return {
      ...player,
      firstName: 'Benoit',
    };
  }

  // Benoit Lefevre
  if (
    player.memberId === '30026092' &&
    player.firstName === 'Benoit' &&
    player.lastName === 'Lefevre'
  ) {
    return {
      ...player,
      firstName: 'Benoît',
      lastName: 'Lefèvre',
    };
  }

  // Benoit Close Lecocq
  if (
    player.memberId === '30025363' &&
    player.firstName === 'Benoit' &&
    player.lastName === 'Close Lecocq'
  ) {
    return {
      ...player,
      lastName: 'Close-Lecocq',
    };
  }

  // Benoît Close Lecocq
  if (
    player.memberId === '30025363' &&
    player.firstName === 'Benoît' &&
    player.lastName === 'Close Lecocq'
  ) {
    return {
      ...player,
      firstName: 'Benoit',
      lastName: 'Close-Lecocq',
    };
  }

  // Azeem Fowad Shahid
  if (
    player.memberId === '50307193' &&
    player.firstName === 'Azeem Fowad' &&
    player.lastName === 'Shahid'
  ) {
    return {
      ...player,
      firstName: 'Azeem Fawad',
    };
  }

  // Aymane Zaki
  if (
    player.memberId === '30073630' &&
    player.firstName === 'Aymane' &&
    player.lastName === 'Zaki'
  ) {
    return {
      ...player,
      lastName: 'Zaihi',
    };
  }

  // Aurelien Vermylen
  if (
    player.memberId === '30056330' &&
    player.firstName === 'Aurelien' &&
    player.lastName === 'Vermylen'
  ) {
    return {
      ...player,
      firstName: 'Aurélien',
    };
  }

  // AuréLie Deblandre
  if (
    player.memberId === '30044089' &&
    player.firstName === 'AuréLie' &&
    player.lastName === 'Deblandre'
  ) {
    return {
      ...player,
      firstName: 'Aurelie',
      lastName: 'Deblandre',
    };
  }

  // Aubane Moura
  if (
    player.memberId === '6993788' &&
    player.firstName === 'Aubane' &&
    player.lastName === 'Moura'
  ) {
    return {
      ...player,
      firstName: 'Aubanne',
      lastName: 'Moura',
    };
  }

  // Arthur Debaere
  if (
    player.memberId === '50104587' &&
    player.firstName === 'Arthur' &&
    player.lastName === 'Debaere'
  ) {
    return {
      ...player,
      lastName: 'De Baere',
    };
  }

  // Armand Fameree
  if (
    player.memberId === '30065484' &&
    player.firstName === 'Armand' &&
    player.lastName === 'Fameree'
  ) {
    return {
      ...player,
      lastName: 'Frameree',
    };
  }

  // Aquib Mohammed
  if (
    player.memberId === '1258760' &&
    player.firstName === 'Aquib' &&
    player.lastName === 'Mohammed'
  ) {
    return {
      ...player,
      firstName: 'Mohammed',
      lastName: 'Aquib',
    };
  }

  // Antoine Docquier
  if (
    player.memberId === '30062852' &&
    player.firstName === 'Antoine' &&
    player.lastName === 'Docquier'
  ) {
    return {
      ...player,
      lastName: 'Dockier',
    };
  }

  // Anne-Laure Heirebaut
  if (
    player.memberId === '50549537' &&
    player.firstName === 'Anne-Laure' &&
    player.lastName === 'Heirebaut'
  ) {
    return {
      ...player,
      lastName: 'Heirbaut',
    };
  }

  // Anne De Clerck
  if (
    player.memberId === '50083241' &&
    player.firstName === 'Anne' &&
    player.lastName === 'De Clerck'
  ) {
    return {
      ...player,
      lastName: 'Declerck',
    };
  }

  // Angelique Hoogstate De Vos
  if (player.memberId === '813217' && player.firstName === 'Angelique') {
    return {
      ...player,
      lastName: 'Hoogstrate - De Vos',
    };
  }

  // Anaïs Leveaux
  if (
    player.memberId === '30084608' &&
    player.firstName === 'Anaïs' &&
    player.lastName === 'Leveaux'
  ) {
    return {
      ...player,
      firstName: 'Anaïs',
      lastName: 'Levaux',
    };
  }

  // AméLie Pierre
  if (
    player.memberId === '30021882' &&
    player.firstName === 'AméLie' &&
    player.lastName === 'Pierre'
  ) {
    return {
      ...player,
      firstName: 'Amélie',
    };
  }

  // Amelie Pierre
  if (
    player.memberId === '30021882' &&
    player.firstName === 'Amelie' &&
    player.lastName === 'Pierre'
  ) {
    return {
      ...player,
      firstName: 'Amélie',
    };
  }

  // Alisha Nunley
  if (
    player.memberId === '1285595' &&
    player.firstName === 'Alisha' &&
    player.lastName === 'Nunley'
  ) {
    return {
      ...player,
      firstName: 'Alisha',
      lastName: 'Johnson',
    };
  }

  // Adrian Ciscatto
  if (
    player.memberId === '50261126' &&
    player.firstName === 'Adrian' &&
    player.lastName === 'Ciscatto'
  ) {
    return {
      ...player,
      lastName: 'Ciscato',
    };
  }

  // Ade Chandra Indra Bagus
  if (
    player.memberId === '6747110' &&
    player.firstName === 'Ade Chandra' &&
    player.lastName === 'Indra Bagus'
  ) {
    return {
      ...player,
      firstName: 'Indra Bagus',
      lastName: 'Ade Chandra',
    };
  }

  // Abdul Raheem
  if (
    player.memberId === '1305584' &&
    player.firstName === 'Abdul' &&
    player.lastName === 'Raheem'
  ) {
    return {
      ...player,
      firstName: 'Abdul',
      lastName: 'Raheem Ali',
    };
  }
  // Abdul Raheem
  if (player.memberId === '06747110') {
    return {
      ...player,
      firstName: 'Ade',
      lastName: 'Chandra Indra Bagus',
    };
  }

  // Elsa Danckers
  if (
    player.memberId === '' &&
    player.firstName === 'Elsa' &&
    player.lastName === 'Danckers'
  ) {
    return {
      ...player,
      memberId: '267665',
    };
  }

  // Max Wieland
  if (
    player.memberId === '' &&
    player.firstName === 'Max' &&
    player.lastName === 'Wieland'
  ) {
    return {
      ...player,
      memberId: '883398',
    };
  }
  // Novi Wieland
  if (
    player.memberId === '' &&
    player.firstName === 'Novi' &&
    player.lastName === 'Wieland'
  ) {
    return {
      ...player,
      memberId: '887043',
    };
  }

  //  Christian Fischer
  if (
    player.memberId === '' &&
    player.firstName === 'Christian' &&
    player.lastName === 'Fischer'
  ) {
    return {
      ...player,
      memberId: '66737',
    };
  }

  // Thijs Van Den Berg
  if (player.firstName === 'Thijs' && player.lastName === 'Van Den Berg') {
    return {
      ...player,
      memberId: '851092',
    };
  }

  // Justine Lambrechts
  if (player.firstName === 'Justine' && player.lastName === 'Lambrechts') {
    return {
      ...player,
      memberId: '50084753',
    };
  }

  // Iris Van Leijsen
  if (player.firstName === 'Iris' && player.lastName === 'Van Leijsen') {
    return {
      ...player,
      memberId: '832127',
    };
  }

  if (
    player.memberId === '' &&
    player.firstName === 'Koen' &&
    player.lastName === 'Claes'
  ) {
    return {
      ...player,
      memberId: undefined,
    };
  }
  if (
    player.memberId === '' &&
    player.firstName === 'Frie' &&
    player.lastName === 'Van Den Brande'
  ) {
    return {
      ...player,
      memberId: undefined,
    };
  }
  if (
    player.memberId === '' &&
    player.firstName === 'Guy' &&
    player.lastName === 'Dilles'
  ) {
    return {
      ...player,
      memberId: undefined,
    };
  }
  if (
    player.memberId === '' &&
    player.firstName === 'Sergio' &&
    player.lastName === 'Carrilho'
  ) {
    return {
      ...player,
      memberId: undefined,
    };
  }
  if (
    (player.firstName === 'Elias' && player.lastName === 'Goossens') ||
    player.memberId === '50641964'
  ) {
    return {
      ...player,
      memberId: '50529021',
    };
  }

  if (player.memberId === '30026445') {
    return {
      ...player,
      firstName: 'Grégory',
    };
  }

  if (player.memberId === '30079131') {
    return {
      ...player,
      firstName: 'Chahrazade',
      lastName: 'Serraj',
    };
  }

  if (player.firstName === 'Lindsey' && player.lastName === 'Wenzlawski') {
    return {
      ...player,
      memberId: '50588737',
    };
  }

  if (player.memberId === '50711059') {
    return {
      ...player,
      memberId: '50090114',
    };
  }

  if (player.firstName === 'Sarina' && player.lastName === 'Eerdekens') {
    return {
      ...player,
      memberId: '50219812',
    };
  }

  // // Fixme
  // if (player.memberId === '') {
  //   return {
  //     ...player,
  //     memberId: 'Fixme'
  //   };
  // }
  //

  return player;
};
