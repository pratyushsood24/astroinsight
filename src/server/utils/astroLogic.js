// astroinsight/src/server/utils/astroLogic.js
// Helper functions for astrological data processing, formatting for Claude, etc.
import { logger } from './logger.js';

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

/**
 * Converts decimal degrees to a zodiac sign, degree, minute, second string.
 * @param {number} totalDegrees - The longitude in decimal degrees.
 * @returns {string} Formatted string e.g., "15° Aries 30' 25\"".
 */
export function formatLongitude(totalDegrees) {
  if (typeof totalDegrees !== 'number' || isNaN(totalDegrees)) {
    return "N/A";
  }
  const correctedDegrees = (totalDegrees % 360 + 360) % 360; // Normalize to 0-359.999
  const signIndex = Math.floor(correctedDegrees / 30);
  const degreesInSign = correctedDegrees % 30;
  
  const degrees = Math.floor(degreesInSign);
  const minutesDecimal = (degreesInSign - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.floor((minutesDecimal - minutes) * 60);

  return `${degrees}° ${ZODIAC_SIGNS[signIndex]} ${String(minutes).padStart(2, '0')}' ${String(seconds).padStart(2, '0')}"`;
}

/**
 * Formats raw birth chart data (from Swiss Ephemeris) into a structured XML string for Claude.
 * @param {object} chartData - The raw chart data object. Expected to have `planets`, `houses`, `birthDate`, etc.
 * @param {string} [chartData.name] - Name of the person.
 * @param {string} [chartData.gender] - Gender of the person.
 * @param {object} [chartData.ayanamsa] - Ayanamsa details if sidereal.
 * @returns {string} XML formatted string.
 */
export function formatBirthChartDataAsXML(chartData) {
  if (!chartData || !chartData.planets || !chartData.houses) {
    logger.warn('Insufficient chart data for XML formatting.');
    return "<error>Insufficient chart data provided</error>";
  }

  let xml = "<birth_chart_details>\n";

  // Basic Info
  xml += "  <personal_information>\n";
  if (chartData.name) xml += `    <name>${chartData.name}</name>\n`;
  if (chartData.birthDate) xml += `    <birth_date>${chartData.birthDate}</birth_date>\n`;
  if (chartData.birthTime) xml += `    <birth_time>${chartData.birthTime}</birth_time>\n`;
  if (chartData.location && chartData.location.timezone) {
    xml += `    <birth_location_details>\n`;
    if (chartData.location.latitude) xml += `      <latitude>${chartData.location.latitude.toFixed(4)}</latitude>\n`;
    if (chartData.location.longitude) xml += `      <longitude>${chartData.location.longitude.toFixed(4)}</longitude>\n`;
    xml += `      <timezone>${chartData.location.timezone}</timezone>\n`;
    xml += `    </birth_location_details>\n`;
  }
  if (chartData.gender) xml += `    <gender>${chartData.gender}</gender>\n`;
  xml += "  </personal_information>\n";

  // Astrological System
  xml += "  <astrological_system>\n";
  xml += `    <house_system>${chartData.houseSystem || 'Placidus'}</house_system>\n`;
  if (chartData.ayanamsa && chartData.ayanamsa.name) {
    xml += `    <calculation_type>Sidereal</calculation_type>\n`;
    xml += `    <ayanamsa_name>${chartData.ayanamsa.name}</ayanamsa_name>\n`;
    xml += `    <ayanamsa_value>${chartData.ayanamsa.value.toFixed(6)}</ayanamsa_value>\n`;
  } else {
    xml += `    <calculation_type>Tropical</calculation_type>\n`;
  }
  xml += "  </astrological_system>\n";

  // Planetary Positions
  xml += "  <planetary_positions>\n";
  for (const [name, data] of Object.entries(chartData.planets)) {
    xml += `    <planet name="${name}">\n`;
    xml += `      <longitude_decimal>${data.longitude.toFixed(6)}</longitude_decimal>\n`;
    xml += `      <longitude_formatted>${formatLongitude(data.longitude)}</longitude_formatted>\n`;
    if (typeof data.latitude === 'number') xml += `      <latitude_decimal>${data.latitude.toFixed(6)}</latitude_decimal>\n`;
    if (typeof data.speedLon === 'number') xml += `      <speed_longitude_per_day>${data.speedLon.toFixed(6)}</speed_longitude_per_day>\n`;
    if (typeof data.isRetrograde === 'boolean') xml += `      <is_retrograde>${data.isRetrograde}</is_retrograde>\n`;
    // Find house placement
    const housePlacement = getHousePlacement(data.longitude, chartData.houses.cusps, chartData.houses.ascendant, chartData.houseSystem);
    if (housePlacement) xml += `      <house_placement>${housePlacement}</house_placement>\n`;
    xml += `    </planet>\n`;
  }
  xml += "  </planetary_positions>\n";

  // House Cusps
  xml += "  <house_cusps>\n";
  xml += `    <ascendant_longitude_decimal>${chartData.houses.ascendant.toFixed(6)}</ascendant_longitude_decimal>\n`;
  xml += `    <ascendant_longitude_formatted>${formatLongitude(chartData.houses.ascendant)}</ascendant_longitude_formatted>\n`;
  xml += `    <midheaven_longitude_decimal>${chartData.houses.mc.toFixed(6)}</midheaven_longitude_decimal>\n`;
  xml += `    <midheaven_longitude_formatted>${formatLongitude(chartData.houses.mc)}</midheaven_longitude_formatted>\n`;
  chartData.houses.cusps.forEach((cusp, index) => {
    xml += `    <house_cusp number="${index + 1}">\n`;
    xml += `      <longitude_decimal>${cusp.toFixed(6)}</longitude_decimal>\n`;
    xml += `      <longitude_formatted>${formatLongitude(cusp)}</longitude_formatted>\n`;
    xml += `    </house_cusp>\n`;
  });
  xml += "  </house_cusps>\n";
  
  // TODO: Add Aspects if available in chartData.aspects
  // xml += "  <aspects>\n";
  // if (chartData.aspects) {
  //   chartData.aspects.forEach(aspect => {
  //     xml += `    <aspect type="${aspect.type}" planet1="${aspect.planet1}" planet2="${aspect.planet2}" orb="${aspect.orb.toFixed(2)}"/>\n`;
  //   });
  // }
  // xml += "  </aspects>\n";

  xml += "</birth_chart_details>";
  return xml;
}


/**
 * Formats transit data into a structured XML string for Claude.
 * @param {object} transitData - Object containing transit information, typically date and planetary positions.
 * @param {string} transitData.date - Date of transits.
 * @param {object} transitData.planets - Object of transiting planets and their longitudes/speeds.
 * @returns {string} XML formatted string.
 */
export function formatTransitDataAsXML(transitData) {
  if (!transitData || !transitData.date || !transitData.planets) {
    logger.warn('Insufficient transit data for XML formatting.');
    return "<error>Insufficient transit data provided</error>";
  }

  let xml = "<transit_details>\n";
  xml += `  <transit_date>${transitData.date}</transit_date>\n`;
  xml += "  <transiting_planets>\n";
  for (const [name, data] of Object.entries(transitData.planets)) {
    xml += `    <planet name="${name}">\n`;
    xml += `      <longitude_decimal>${data.longitude.toFixed(6)}</longitude_decimal>\n`;
    xml += `      <longitude_formatted>${formatLongitude(data.longitude)}</longitude_formatted>\n`;
    if (typeof data.speedLon === 'number') xml += `      <speed_longitude_per_day>${data.speedLon.toFixed(6)}</speed_longitude_per_day>\n`;
    if (typeof data.isRetrograde === 'boolean') xml += `      <is_retrograde>${data.isRetrograde}</is_retrograde>\n`;
    xml += `    </planet>\n`;
  }
  xml += "  </transiting_planets>\n";
  xml += "</transit_details>";
  return xml;
}


/**
 * Determines the house placement of a planet.
 * This is a simplified version. Accurate house placement can be complex, especially near cusps or with different house systems.
 * @param {number} planetLongitude - Decimal longitude of the planet.
 * @param {Array<number>} houseCusps - Array of 12 house cusp longitudes (1st cusp is index 0).
 * @param {number} ascendantLongitude - Decimal longitude of the Ascendant (used for Whole Sign).
 * @param {string} houseSystem - The house system used (e.g., 'P' for Placidus, 'W' for Whole Sign).
 * @returns {number|null} The house number (1-12) or null if error.
 */
export function getHousePlacement(planetLongitude, houseCusps, ascendantLongitude, houseSystem) {
  if (!houseCusps || houseCusps.length !== 12) return null;
  const planetLon = (planetLongitude % 360 + 360) % 360;

  if (houseSystem.toUpperCase() === 'W') { // Whole Sign Houses
    const ascSignIndex = Math.floor(((ascendantLongitude % 360 + 360) % 360) / 30);
    const planetSignIndex = Math.floor(planetLon / 30);
    // House number is (planet's sign index - ascendant's sign index + 1) mod 12
    // (adding 12 before modulo to handle negative results, then +1 for 1-based indexing)
    let house = (planetSignIndex - ascSignIndex + 12) % 12;
    return house + 1; // Houses are 1-12
  }

  // For quadrant-based systems like Placidus (simplified logic)
  // This logic assumes cusps are ordered and handles wrap-around 0 Aries.
  // A more robust method would check angles carefully.
  for (let i = 0; i < 12; i++) {
    const cusp1 = (houseCusps[i] % 360 + 360) % 360;
    const cusp2 = (houseCusps[(i + 1) % 12] % 360 + 360) % 360; // Next cusp, or Cusp 1 for House 12

    if (cusp1 <= cusp2) { // Normal case, e.g., Cusp 1 = 10 Aries, Cusp 2 = 5 Taurus
      if (planetLon >= cusp1 && planetLon < cusp2) {
        return i + 1;
      }
    } else { // Wrap-around case, e.g., Cusp 1 = 25 Pisces, Cusp 2 = 20 Aries
      if ((planetLon >= cusp1 && planetLon < 360) || (planetLon >= 0 && planetLon < cusp2)) {
        return i + 1;
      }
    }
  }
  // Fallback if no house found (should not happen with correct cusps)
  logger.warn(`Could not determine house placement for planet at ${planetLon} with given cusps.`);
  return null; 
}