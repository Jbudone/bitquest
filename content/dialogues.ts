import { DialogueNode } from '../../shared/src/types';

export const STARTER_DIALOGUES: Record<string, Record<string, DialogueNode>> = {
  barnaby: {
    greeting: {
      speaker: 'Barnaby the Pelican Courier',
      portrait: 'pelican',
      text: 'HWAFF! *pant pant* Greetings traveler! {mood:surprised}You haven\'t happened to see a satchel of {shake}extremely sensitive{/shake} {gold}love letters{/gold} addressed to the blacksmith? A gust took it right over the town pond!',
      responses: [
        { text: 'Did you really drop someone\'s love letters in the pond?', nextDialogueKey: 'letters_excuse' },
        { text: 'I\'ll keep an eye out for floating paper.', nextDialogueKey: 'thanks' },
        { text: 'Nice feathers, Barnaby.', nextDialogueKey: 'flattery' }
      ]
    },
    letters_excuse: {
      speaker: 'Barnaby the Pelican Courier',
      portrait: 'pelican',
      text: '{mood:surprised}I didn\'t DROP them! The wind committed postal larceny! The Mayor says if I lose one more parcel, they will demote me to {shake}pond goose{/shake}. A {red}GOOSE{/red}, I say! The indignity!',
      responses: [
        { text: 'Stay strong, Barnaby.', nextDialogueKey: 'thanks' }
      ]
    },
    flattery: {
      speaker: 'Barnaby the Pelican Courier',
      portrait: 'pelican',
      text: '{mood:smug}Why, thank you! It takes {wave}three whole hours of preening{/wave} with certified Oakhaven bayberry wax. But alas, style cannot deliver mail on time!',
      responses: [
        { text: 'Good luck with the deliveries!', nextDialogueKey: 'thanks' }
      ]
    },
    thanks: {
      speaker: 'Barnaby the Pelican Courier',
      portrait: 'pelican',
      text: '{mood:happy}If you find anything shiny or soggy, bring it to me! I dropped {gold}3 Postal Letters{/gold} across {cyan}Whispering Meadow{/cyan}, {purple}Fungal Hollow{/purple}, and South Lake. Bring them for {gold}30 shiny coins{/gold}!',
      responses: [
        { text: 'I\'ll search every corner of the realm, Barnaby!', nextDialogueKey: 'searching' }
      ]
    },
    searching: {
      speaker: 'Barnaby the Pelican Courier',
      portrait: 'pelican',
      text: '{mood:happy}Bless your feathered heart! The letters have a {red}red wax seal{/red}. Keep your eyes peeled near the bridges and mushroom hollows!',
    }
  },

  grandma: {
    greeting: {
      speaker: 'Grandma Bramble',
      portrait: 'grandma',
      text: '{mood:happy}Oh hello there, dearie! Have a warm scone. The wild Sproutlings in Whispering Meadow keep nibbling my fresh {red}sweet strawberries{/red}! If you bring me strawberries, I will bake you something special.',
      responses: [
        { text: 'Why are you whispering about legal jam, Grandma?', nextDialogueKey: 'jam_whisper' },
        { text: 'The scone smells wonderful, thank you!', nextDialogueKey: 'scone' },
        { text: 'Do you know anything about the ancient ruins up north?', nextDialogueKey: 'ruins' }
      ]
    },
    jam_whisper: {
      speaker: 'Grandma Bramble',
      portrait: 'grandma',
      text: '{mood:smug}Hush now! The Tax Collector has ears in every bush. Let\'s just say Mayor Higgins tried to put a 20% tariff on sweet preserves, and now his fountain {wave}mysteriously flows with syrup{/wave}.',
      responses: [
        { text: 'You sabotaged the town fountain?!', nextDialogueKey: 'fountain' }
      ]
    },
    fountain: {
      speaker: 'Grandma Bramble',
      portrait: 'grandma',
      text: '{mood:happy}I prefer the term {gold}"creative civic plumbing"{/gold}. Now go on, explore the square! Cut some overgrown weeds if you want to find pocket silver.',
    },
    scone: {
      speaker: 'Grandma Bramble',
      portrait: 'grandma',
      text: '{mood:happy}Eat up, my child! Adventurers need plenty of carbohydrates to lift heavy clay pots and dash around.',
    },
    ruins: {
      speaker: 'Grandma Bramble',
      portrait: 'grandma',
      text: '{mood:surprised}Ah, the Sunken Gate! Legend says two brave souls must stand on the dual stone switches simultaneously to break the ancient moss seal. Beyond lies the Sanctuary where the {shake}{purple}Truffle Baron{/purple}{/shake} hoards stolen glints!',
    }
  },

  sir_reginald: {
    greeting: {
      speaker: 'Sir Reginald (The Monocled Rooster)',
      portrait: 'rooster',
      text: '{mood:smug}*adjusts monocle with wing* Cluck. Traveler! That pompous fungal usurper, {shake}{red}Baron von Truffle{/red}{/shake}, has seized the Sunken Sanctuary and stolen the town\'s sacred {gold}Golden Acorn Crown{/gold}!',
      responses: [
        { text: 'Tell me about the Baron!', nextDialogueKey: 'baron_info' },
        { text: 'How do I reach the Sanctuary?', nextDialogueKey: 'gate_info' },
        { text: 'Pleased to meet you, Your Majesty.', nextDialogueKey: 'majesty' }
      ]
    },
    baron_info: {
      speaker: 'Sir Reginald (The Monocled Rooster)',
      portrait: 'rooster',
      text: '{mood:surprised}He is a creature of immense vanity! He stomps sending shockwaves and spews {purple}homing spores{/purple}! But when he charges into stone pillars, he {shake}stuns himself{/shake}! That is your moment to strike!',
      responses: [
        { text: 'I will defeat him and reclaim the Golden Crown!', nextDialogueKey: 'oath' }
      ]
    },
    gate_info: {
      speaker: 'Sir Reginald (The Monocled Rooster)',
      portrait: 'rooster',
      text: '{mood:smug}The Ancient Gate to the north is locked by {gold}twin Sun Stones{/gold}. Stand on one switch and place a heavy clay pot on the other to unlock the path!',
    },
    oath: {
      speaker: 'Sir Reginald (The Monocled Rooster)',
      portrait: 'rooster',
      text: '{mood:happy}Magnificent courage! Return with the {gold}Golden Acorn Crown{/gold} and you shall be knighted {gold}Champion of Oakhaven{/gold}!',
    },
    majesty: {
      speaker: 'Sir Reginald (The Monocled Rooster)',
      portrait: 'rooster',
      text: '{mood:smug}Ah, a creature of culture! Take heed: the clay pots scattered across this square contain both treasure and the weight of shattered ceramic dreams.',
    }
  },

  baron_truffle: {
    greeting: {
      speaker: 'Baron von Truffle (Sovereign of Spores)',
      portrait: 'baron',
      text: '{mood:smug}{shake}MWAHAHA!{/shake} Who dares disturb the royal moistness of the Truffle Throne?! This {gold}{rainbow}Golden Acorn Crown{/rainbow}{/gold} belongs to {wave}MY magnificent cap{/wave}! Kneel or be turned to {red}compost{/red}!',
      responses: [
        { text: 'Return the village crown, you overgrown toadstool!', action: 'fight_boss' }
      ]
    }
  },

  dog_buster: {
    greeting: {
      speaker: 'Buster the Village Pup',
      portrait: 'dog',
      text: '{mood:happy}*wag wag wag wag* {wave}Woof!{/wave} *Buster rolls onto his belly and looks up at you with {gold}pure adoration{/gold}*',
      responses: [
        { text: '[Pet Buster on the head]', action: 'pet_dog' },
        { text: '[Offer a belly rub]', action: 'pet_dog' }
      ]
    }
  },

  sign_square: {
    greeting: {
      speaker: 'Wooden Notice Board',
      portrait: 'sign',
      text: '📜 [OAKHAVEN TOWN NOTICE]\n1. Please refrain from kicking chickens.\n2. Whoever keeps hiding the library keys inside clay pots, STOP.\n3. The mystery jam tasting tonight at 7 PM has been relocated to the woods.',
    }
  },

  sign_ruins: {
    greeting: {
      speaker: 'Ancient Mossy Slab',
      portrait: 'sign',
      text: '🪨 [CO-OP PUZZLE ENGRAVING]\n"When two kindred spirits stand upon the twin sun stones at once, the verdant gate shall yield its path. (Solo hint: Clay pots work as trusty stand-ins!)"',
    }
  }
};
