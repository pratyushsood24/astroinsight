// astroinsight/src/server/integrations/geolocation.js
import { Client, Status } from '@googlemaps/google-maps-services-js';
import { logger } from '../utils/logger.js';
import prisma from '@wasp/db'; // For ApiLog

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  logger.error('GOOGLE_MAPS_API_KEY is not set. Geolocation services will not work.');
}

const client = GOOGLE_MAPS_API_KEY ? new Client({}) : null;

async function logGoogleApiCall({ endpoint, requestData, responseData, isSuccess, errorMessage, userId }) {
  try {
    await prisma.apiLog.create({
      data: {
        userId,
        apiService: 'GoogleMaps',
        endpoint,
        requestData: JSON.stringify(requestData),
        responseData: JSON.stringify(responseData),
        isSuccess,
        errorMessage,
      },
    });
  } catch (error) {
    logger.error('Failed to log Google Maps API call to database:', error);
  }
}

/**
 * Geocodes an address string to latitude and longitude.
 * @param {string} address - The address string (e.g., "1600 Amphitheatre Parkway, Mountain View, CA").
 * @param {number|null} userId - The ID of the user making the request, for logging.
 * @returns {Promise<object|null>} - { latitude, longitude, formattedAddress, placeId } or null if not found/error.
 */
export async function geocodeAddress(address, userId = null) {
  if (!client) {
    logger.error('Google Maps client not initialized. GOOGLE_MAPS_API_KEY missing?');
    throw new Error('Geolocation service is currently unavailable.');
  }

  const params = { address, key: GOOGLE_MAPS_API_KEY };
  let apiResponse;
  try {
    apiResponse = await client.geocode({ params });

    if (apiResponse.data.status === Status.OK && apiResponse.data.results.length > 0) {
      const result = apiResponse.data.results[0];
      const location = result.geometry.location; // lat, lng
      await logGoogleApiCall({
        userId,
        endpoint: 'geocode',
        requestData: params,
        responseData: result,
        isSuccess: true,
      });
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
      };
    } else {
      logger.warn(`Geocoding failed for address "${address}": ${apiResponse.data.status}`, apiResponse.data.error_message);
      await logGoogleApiCall({
        userId,
        endpoint: 'geocode',
        requestData: params,
        responseData: apiResponse.data,
        isSuccess: false,
        errorMessage: apiResponse.data.error_message || apiResponse.data.status,
      });
      return null;
    }
  } catch (error) {
    logger.error('Error during geocoding request:', error.response?.data || error.message);
    await logGoogleApiCall({
      userId,
      endpoint: 'geocode',
      requestData: params,
      responseData: error.response?.data,
      isSuccess: false,
      errorMessage: error.message,
    });
    throw new Error(`Geocoding request failed: ${error.message}`);
  }
}

/**
 * Gets timezone information for a given latitude and longitude at a specific timestamp.
 * @param {number} latitude - Latitude.
 * @param {number} longitude - Longitude.
 * @param {Date} [timestamp=new Date()] - The timestamp for which to get the timezone. Defaults to now.
 * @param {number|null} userId - The ID of the user making the request, for logging.
 * @returns {Promise<object|null>} - { dstOffset, rawOffset, timeZoneId, timeZoneName } or null if error.
 */
export async function getTimezone(latitude, longitude, timestamp = new Date(), userId = null) {
  if (!client) {
    logger.error('Google Maps client not initialized. GOOGLE_MAPS_API_KEY missing?');
    throw new Error('Timezone service is currently unavailable.');
  }

  // Google Time Zone API expects timestamp in seconds since epoch.
  const timestampSeconds = Math.floor(timestamp.getTime() / 1000);
  const params = {
    location: { lat: latitude, lng: longitude },
    timestamp: timestampSeconds,
    key: GOOGLE_MAPS_API_KEY,
  };
  let apiResponse;

  try {
    apiResponse = await client.timezone({ params });

    if (apiResponse.data.status === Status.OK) {
      await logGoogleApiCall({
        userId,
        endpoint: 'timezone',
        requestData: params,
        responseData: apiResponse.data,
        isSuccess: true,
      });
      return {
        dstOffset: apiResponse.data.dstOffset, // Daylight Saving Time offset in seconds
        rawOffset: apiResponse.data.rawOffset, // Offset from UTC (not including DST) in seconds
        timeZoneId: apiResponse.data.timeZoneId, // e.g., "America/Los_Angeles"
        timeZoneName: apiResponse.data.timeZoneName, // e.g., "Pacific Daylight Time"
      };
    } else {
      logger.warn(`Timezone lookup failed for ${latitude},${longitude}: ${apiResponse.data.status}`, apiResponse.data.errorMessage);
       await logGoogleApiCall({
        userId,
        endpoint: 'timezone',
        requestData: params,
        responseData: apiResponse.data,
        isSuccess: false,
        errorMessage: apiResponse.data.errorMessage || apiResponse.data.status,
      });
      return null;
    }
  } catch (error) {
    logger.error('Error during timezone request:', error.response?.data || error.message);
    await logGoogleApiCall({
        userId,
        endpoint: 'timezone',
        requestData: params,
        responseData: error.response?.data,
        isSuccess: false,
        errorMessage: error.message,
      });
    throw new Error(`Timezone request failed: ${error.message}`);
  }
}

// Note: Google Places Autocomplete is typically implemented on the client-side
// using the Google Maps JavaScript API for a better UX.
// If server-side Place Autocomplete is needed, it can be added here.
// (e.g., for a backend process or if client-side JS is not feasible)