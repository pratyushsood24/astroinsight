// astroinsight/src/server/integrations/ephemeris.js
import sweph from 'sweph-js';
import { logger } from '../utils/logger.js';
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { toDate } from 'date-fns';

// Ensure ephemeris files are available.
// sweph-js will look in process.env.SWEPH_PATH, then its default path.
// It's good practice to set SWEPH_PATH in .env.server if you manage files manually.
const SWEPH_PATH = process.env.SWEPH_PATH;
if (SWEPH_PATH) {
  sweph.swe_set_ephe_path(SWEPH_PATH);
  logger.info(`Swiss Ephemeris path configured to: ${SWEPH_PATH}`);
} else {
  logger.warn('SWEPH_PATH not set, sweph-js will use default path for ephemeris files.');
  // For sweph-js, it might bundle ephemeris data or have a default download/cache mechanism.
  // Check its documentation. If issues arise, manually setting SWEPH_PATH is recommended.
}

// Constants for planets. Add more if needed (asteroids, etc.)
const PLANET_LIST = {
  SE_SUN: sweph.SE_SUN,
  SE_MOON: sweph.SE_MOON,
  SE_MERCURY: sweph.SE_MERCURY,
  SE_VENUS: sweph.SE_VENUS,
  SE_MARS: sweph.SE_MARS,
  SE_JUPITER: sweph.SE_JUPITER,
  SE_SATURN: sweph.SE_SATURN,
  SE_URANUS: sweph.SE_URANUS,
  SE_NEPTUNE: sweph.SE_NEPTUNE,
  SE_PLUTO: sweph.SE_PLUTO,
  SE_MEAN_NODE: sweph.SE_MEAN_NODE, // Rahu (North Node)
  // SE_TRUE_NODE for True Node if preferred
  // Ketu (South Node) is typically 180 degrees from Rahu
};

const PLANET_NAMES = {
  [sweph.SE_SUN]: 'Sun',
  [sweph.SE_MOON]: 'Moon',
  [sweph.SE_MERCURY]: 'Mercury',
  [sweph.SE_VENUS]: 'Venus',
  [sweph.SE_MARS]: 'Mars',
  [sweph.SE_JUPITER]: 'Jupiter',
  [sweph.SE_SATURN]: 'Saturn',
  [sweph.SE_URANUS]: 'Uranus',
  [sweph.SE_NEPTUNE]: 'Neptune',
  [sweph.SE_PLUTO]: 'Pluto',
  [sweph.SE_MEAN_NODE]: 'Rahu', // North Node
  // Ketu can be derived
};

const HOUSE_SYSTEMS = {
  PLACIDUS: 'P', // Placidus
  KOCH: 'K',
  REGIOMONTANUS: 'R',
  CAMPANUS: 'C',
  EQUAL: 'E', // Equal house (Ascendant based)
  WHOLE_SIGN: 'W', // Whole Sign (0 degrees of Ascendant sign)
  // Add more as needed
};

// Ayanamsa constants (for Vedic astrology)
const AYANAMSA_MODES = {
  LAHIRI: sweph.SEFLG_SIDM_LAHIRI,
  RAMAN: sweph.SEFLG_SIDM_RAMAN,
  KRISHNAMURTI: sweph.SEFLG_SIDM_KRISHNAMURTI,
  // Add more as needed
};

/**
 * Calculates Julian Day Universal Time (JDUT) from a given date, time, and timezone.
 * @param {Date|string} birthDateObj - The birth date (can be a Date object or string like 'YYYY-MM-DD').
 * @param {string} birthTimeStr - The birth time string in "HH:MM" format.
 * @param {string} timezone - IANA timezone string (e.g., "America/New_York").
 * @returns {number} Julian Day Universal Time.
 */
function getJulianDayUT(birthDateObj, birthTimeStr, timezone) {
  // Parse the birth date and time in the local timezone
  const [hours, minutes] = birthTimeStr.split(':').map(Number);
  
  // Combine date and time into a single Date object, assuming it's local to the timezone
  // date-fns-tz handles this robustly.
  // First, create a date string in ISO-like format but for the specific timezone
  const localBirthDateTimeStr = `${format(toDate(birthDateObj), 'yyyy-MM-dd')}T${birthTimeStr}:00`;
  
  // Convert this local time in the specific timezone to UTC
  const utcDate = zonedTimeToUtc(localBirthDateTimeStr, timezone);

  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth() + 1; // Month is 0-indexed
  const day = utcDate.getUTCDate();
  const hour_decimal = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;
  
  const { ret, jdut, jdet } = sweph.swe_utc_to_jd(
    year, month, day, 
    utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds(), 
    sweph.SE_GREG_CAL // Gregorian calendar
  );

  if (ret < 0) {
    logger.error('Error converting UTC to Julian Day:', ret);
    throw new Error('Failed to calculate Julian Day from UTC.');
  }
  return jdut;
}


/**
 * Calculates astrological data for a birth chart.
 * @param {Date|string} birthDate - Birth date (e.g., '1990-01-15' or Date object).
 * @param {string} birthTime - Birth time (e.g., "14:30").
 * @param {number} latitude - Latitude (e.g., 34.0522).
 * @param {number} longitude - Longitude (e.g., -118.2437).
 * @param {string} timezone - IANA timezone string (e.g., "America/Los_Angeles").
 * @param {string} houseSystemChar - Character for house system (e.g., 'P' for Placidus).
 * @param {string} ayanamsaMode - Ayanamsa mode for sidereal calculations (e.g., sweph.SEFLG_SIDM_LAHIRI). Optional.
 * @returns {Promise<object>} Object containing planetary positions, house cusps, aspects, etc.
 */
export async function calculateBirthChartData(
  birthDate,
  birthTime,
  latitude,
  longitude,
  timezone,
  houseSystemChar = HOUSE_SYSTEMS.PLACIDUS,
  ayanamsaName = 'LAHIRI' // Default to Lahiri for Vedic context
) {
  logger.info(`Calculating birth chart for: ${birthDate} ${birthTime} at ${latitude},${longitude} (TZ: ${timezone})`);

  const jdut = getJulianDayUT(birthDate, birthTime, timezone);
  logger.debug(`Calculated JDUT: ${jdut}`);

  let flags = sweph.SEFLG_SPEED; // Calculate speed for planets
  let ayanamsaValue = 0;

  // If an Ayanamsa is specified (for Vedic/Sidereal charts)
  const ayanamsaMode = AYANAMSA_MODES[ayanamsaName.toUpperCase()];
  if (ayanamsaMode) {
    flags |= sweph.SEFLG_SIDEREAL;
    sweph.swe_set_sid_mode(ayanamsaMode, 0, 0);
    const ayanamsaResult = sweph.swe_get_ayanamsa_ut(jdut);
    ayanamsaValue = ayanamsaResult.ayanamsa;
    logger.info(`Using Ayanamsa: ${ayanamsaName}, Value: ${ayanamsaValue}`);
  } else {
    // For Tropical charts, ensure sidereal mode is off (default)
    // sweph.swe_set_sid_mode(0,0,0) // Might not be needed if not previously set
    logger.info('Calculating Tropical chart (no Ayanamsa).');
  }
  
  // Calculate planetary positions
  const planets = {};
  for (const [name, id] of Object.entries(PLANET_LIST)) {
    const { ret, xx, serr } = sweph.swe_calc_ut(jdut, id, flags);
    if (ret < 0 || serr) {
      logger.error(`Error calculating ${PLANET_NAMES[id]}: ${serr || ret}`);
      throw new Error(`Failed to calculate position for ${PLANET_NAMES[id]}`);
    }
    planets[PLANET_NAMES[id]] = {
      longitude: xx[0], // Ecliptic longitude
      latitude: xx[1],  // Ecliptic latitude
      distance: xx[2],  // Distance in AU
      speedLon: xx[3],  // Speed in longitude (degrees/day)
      speedLat: xx[4],  // Speed in latitude
      speedDist: xx[5], // Speed in distance
      isRetrograde: xx[3] < 0,
    };
  }

  // Calculate Ketu (South Node) - 180 degrees from Rahu (Mean Node)
  if (planets.Rahu) {
    planets.Ketu = {
      longitude: (planets.Rahu.longitude + 180) % 360,
      latitude: -planets.Rahu.latitude, // Opposite latitude
      distance: planets.Rahu.distance, // Same distance (conceptual point)
      speedLon: planets.Rahu.speedLon, // Same speed magnitude, conceptually
      isRetrograde: planets.Rahu.isRetrograde, // Nodes are typically retrograde
    };
  }

  // Calculate house cusps and Ascendant/MC
  // swe_houses_ex for cusps, asc, mc, armc, vertex, etc.
  const { ret: housesRet, cusps, ascmc, serr: housesSerr } = sweph.swe_houses_ex(
    jdut,
    flags, // Use same flags (sidereal if set)
    latitude,
    longitude,
    houseSystemChar.charCodeAt(0)
  );

  if (housesRet < 0 || housesSerr) {
    logger.error(`Error calculating houses: ${housesSerr || housesRet}`);
    throw new Error('Failed to calculate house cusps.');
  }

  const houseCusps = cusps.slice(1, 13); // Cusps 1-12
  const ascendant = ascmc[0];
  const mc = ascmc[1]; // Midheaven (Medium Coeli)
  const armc = ascmc[2]; // Sidereal Time (Argument of RA for MC)
  const vertex = ascmc[3];
  // Other points like equasc (Equatorial Ascendant), coasc1, coasc2, polasc are also in ascmc

  // TODO: Calculate aspects (major: conjunction, opposition, trine, square, sextile)
  // This requires comparing all planet pairs.
  // const aspects = calculateAspects(planets, MAJOR_ASPECT_ORBS);

  // Clean up - reset sidereal mode if it was set
  if (ayanamsaMode) {
    sweph.swe_set_sid_mode(0, 0, 0); // Reset to default (Tropical)
  }
  sweph.swe_close(); // Close ephemeris files if opened by swe_calc_ut or swe_houses

  return {
    jdut,
    birthDate: format(toDate(birthDate), 'yyyy-MM-dd'),
    birthTime,
    location: { latitude, longitude, timezone },
    ayanamsa: ayanamsaMode ? { name: ayanamsaName, value: ayanamsaValue } : null,
    houseSystem: houseSystemChar,
    planets,
    houses: {
      cusps: houseCusps,
      ascendant,
      mc,
      armc,
      vertex,
      // You can add more from ascmc if needed
    },
    // aspects: aspects, // Uncomment when implemented
  };
}

// TODO: Implement calculateAspects function
// function calculateAspects(planets, orbs) {
//   const aspectList = [];
//   const planetKeys = Object.keys(planets);
//   // Iterate through pairs of planets, calculate angular separation, check against orbs
//   return aspectList;
// }

// TODO: Implement calculateTransits function
// export async function calculateTransits(natalChartData, transitDate) {
//   // Calculate planetary positions for transitDate
//   // Then compare these to natalChartData.planets
//   // Requires natal chart's JDUT and transit date's JDUT
// }

// Example usage (for testing, not part of export)
// (async () => {
//   try {
//     const chart = await calculateBirthChartData(
//       '1990-07-21', '09:15', 40.7128, -74.0060, 'America/New_York', 'P', 'LAHIRI'
//     );
//     console.log(JSON.stringify(chart, null, 2));
//   } catch (error) {
//     console.error("Error in example usage:", error);
//   }
// })();