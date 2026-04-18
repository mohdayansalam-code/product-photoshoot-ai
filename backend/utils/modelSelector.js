import { supabase } from "../lib/db.js";

function parseModels(envVar) {
  if (!envVar) return [];
  return envVar.split(',').map(item => {
    const [id, trigger] = item.split('|');
    return {
      tune_id: id.trim(),
      trigger_word: trigger.trim()
    };
  });
}

export async function modelSelector(user_id, gender) {
  // 1. Check DB
  const { data } = await supabase
    .from("user_models")
    .select("tune_id, trigger_word")
    .eq("user_id", user_id)
    .eq("gender", gender)
    .limit(1)
    .maybeSingle();

  if (data && data.tune_id && data.trigger_word) {
    return { tune_id: data.tune_id, trigger_word: data.trigger_word };
  }

  // 2. ELSE: Pick random model from env
  let models = [];
  
  if (gender === "male") {
    models = parseModels(process.env.MALE_MODELS);
  } else if (gender === "female") {
    models = parseModels(process.env.FEMALE_MODELS);
  }

  if (models.length === 0) {
    throw new Error(`No valid models found for gender: ${gender}`);
  }

  const randomIndex = Math.floor(Math.random() * models.length);
  const selectedModel = models[randomIndex];

  // 3. Save to DB
  await supabase.from("user_models").insert({
    user_id,
    tune_id: selectedModel.tune_id,
    trigger_word: selectedModel.trigger_word,
    gender
  });

  return selectedModel;
}
