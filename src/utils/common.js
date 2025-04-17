export const isHumanMessage = (msg) =>
    !msg.subtype && msg.user && !msg.bot_id;

