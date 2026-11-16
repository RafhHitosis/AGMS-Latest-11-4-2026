import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const ACCESS_KEY_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ANIMALS = [
  "Albatross", "Alligator", "Alpaca", "Antelope", "Armadillo", "Badger", "Bat",
  "Bear", "Beaver", "Bison", "Boar", "Buffalo", "Butterfly", "Camel", "Capybara",
  "Caribou", "Cat", "Cheetah", "Chicken", "Chimpanzee", "Chinchilla", "Cobra",
  "Cougar", "Cow", "Coyote", "Crab", "Crane", "Crocodile", "Crow", "Deer",
  "Dingo", "Dog", "Dolphin", "Donkey", "Dove", "Dragonfly", "Duck", "Eagle", "Eel",
  "Elephant", "Falcon", "Ferret", "Finch", "Flamingo", "Fox", "Frog", "Gazelle",
  "Gecko", "Giraffe", "Goat", "Goose", "Gorilla", "Hamster", "Hare", "Hawk",
  "Hedgehog", "Heron", "Hippo", "Horse", "Hyena", "Iguana", "Jaguar", "Jellyfish",
  "Kangaroo", "Koala", "Lemur", "Leopard", "Lion", "Lizard", "Llama", "Lobster",
  "Lynx", "Magpie", "Manatee", "Meerkat", "Mole", "Monkey", "Moose", "Mouse",
  "Narwhal", "Newt", "Octopus", "Ocelot", "Opossum", "Orangutan", "Ostrich",
  "Otter", "Owl", "Ox", "Panda", "Panther", "Parrot", "Peacock", "Pelican",
  "Penguin", "Pig", "Pigeon", "Platypus", "Porcupine", "Quail", "Rabbit",
  "Raccoon", "Ram", "Rat", "Raven", "Reindeer", "Rhinoceros", "Robin",
  "Salamander", "Salmon", "Seal", "Shark", "Sheep", "Skunk", "Sloth", "Snail",
  "Snake", "Sparrow", "Spider", "Squid", "Squirrel", "Starfish", "Stingray",
  "Swan", "Tapir", "Tiger", "Toad", "Toucan", "Turtle", "Walrus", "Warthog",
  "Weasel", "Whale", "Wolf", "Wombat", "Woodpecker", "Yak", "Zebra",
];
const ACCESS_KEY_PATTERN = /^AGMS-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8})-([A-Za-z0-9!@#$%&*+=?_]{16})$/i;
const ANIMAL_WORD_PATTERN = "[A-Z][a-z]+[A-Z][a-z]+";
const ANIMAL_PASSPHRASE_PATTERN = new RegExp(
  `^${ANIMAL_WORD_PATTERN}(?:-${ANIMAL_WORD_PATTERN}){4}$`,
);
const ANIMAL_NUMBER_PATTERN = /^([a-z]+)(\d{4})$/;
const LEGACY_PASSPHRASE_PATTERN = /^[A-Z][a-z]{3}(?:-[A-Z][a-z]{3}){3}-[2-9]-[!@#$%&*+=?_]$/;
const ANIMAL_NAMES = new Set(ANIMALS.map((animal) => animal.toLowerCase()));

const createRandomCode = (length, alphabet) => {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
};

export const generateAccessKey = () => {
  const accessKeyId = createRandomCode(8, ACCESS_KEY_ID_ALPHABET);
  const animal = ANIMALS[randomInt(ANIMALS.length)].toLowerCase();
  const number = String(randomInt(10_000)).padStart(4, "0");
  const passphrase = `${animal}${number}`;
  return {
    accessKeyId,
    accessKey: passphrase,
    accessKeyHash: hashAccessKey(passphrase),
  };
};

export const parseAccessKey = (value) => {
  if (typeof value !== "string") return null;
  const accessKey = value.trim();
  const match = ACCESS_KEY_PATTERN.exec(accessKey);
  if (match) {
    const accessKeyId = match[1].toUpperCase();
    return {
      accessKeyId,
      accessKey: `AGMS-${accessKeyId}-${match[2]}`,
    };
  }
  const animalNumber = ANIMAL_NUMBER_PATTERN.exec(accessKey.toLowerCase());
  if (animalNumber && ANIMAL_NAMES.has(animalNumber[1])) {
    return { accessKey: `${animalNumber[1]}${animalNumber[2]}` };
  }
  return ANIMAL_PASSPHRASE_PATTERN.test(accessKey) ||
    LEGACY_PASSPHRASE_PATTERN.test(accessKey)
    ? { accessKey }
    : null;
};

export const hashAccessKey = (accessKey) =>
  createHash("sha256").update(accessKey).digest("hex");

export const verifyAccessKey = (accessKey, expectedHash) => {
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false;
  }
  const expectedHashBuffer = Buffer.from(expectedHash, "hex");
  const actualMatches = timingSafeEqual(
    Buffer.from(hashAccessKey(accessKey), "hex"),
    expectedHashBuffer,
  );
  const legacyCaseInsensitiveMatches = timingSafeEqual(
    Buffer.from(hashAccessKey(accessKey.toUpperCase()), "hex"),
    expectedHashBuffer,
  );
  return actualMatches || legacyCaseInsensitiveMatches;
};
