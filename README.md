# discord_analytics_bot

work in progress, current funtionality includes: 
- discord bot launches, and says hi in the console.
- connects to a mongodb atlas cluster
- bot listens for messages, and pools them to the specified `limit` before writing to a mongodb database
- more coming soon :)

## config.json
If you care to test it out at this shitty stage then make sure you have the following fields in a `config.json` file
```
  {
    "discord_app_id": "<your discord app id>",
    "discord_pubkey":"<your discord pubkey>",
    "invite_url":"<bot invite url>",
    "token":"<bot token>",
    "mongo_uri":"<mongo connection string>"
}
```

