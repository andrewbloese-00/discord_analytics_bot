const {openai_key}= require("./config.json")
const {OpenAIApi, Configuration } = require("openai")

const config = new Configuration({
    apiKey:openai_key,
})

/**
 * 
 * @returns {OpenAIApi}
 */
const useGPT = function _useGPT(){
    if(useGPT.client){
        return useGPT.client
    } else {
        useGPT.client = new OpenAIApi(config)
    }
}
useGPT.client = null

module.exports = {useGPT}