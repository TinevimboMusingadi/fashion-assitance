/**
 * Weather API client using Open-Meteo (free, no API key required).
 * Provides weather data for outfit suggestions.
 */

export interface WeatherData {
  temperature: number;
  temperatureUnit: string;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

export async function getWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`);
  }
  const data = (await res.json()) as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      weather_code: number;
      wind_speed_10m: number;
      precipitation: number;
    };
  };

  const code = data.current.weather_code;
  const condition = weatherCodeToCondition(code);

  return {
    temperature: data.current.temperature_2m,
    temperatureUnit: "celsius",
    condition,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
  };
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "partly_cloudy";
  if (code >= 45 && code <= 48) return "foggy";
  if (code >= 51 && code <= 67) return "rainy";
  if (code >= 71 && code <= 77) return "snowy";
  if (code >= 80 && code <= 82) return "rainy";
  if (code >= 95) return "stormy";
  return "variable";
}

export function formatWeatherForAgent(weather: WeatherData): string {
  return (
    `Current weather: ${weather.temperature}°C, ${weather.condition}. ` +
    `Humidity: ${weather.humidity}%, wind: ${weather.windSpeed} km/h. ` +
    (weather.precipitation > 0
      ? `Precipitation: ${weather.precipitation} mm. Suggest rain-appropriate clothing.`
      : "")
  );
}
