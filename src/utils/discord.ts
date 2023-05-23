/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { MessageObject } from "@api/MessageEvents";
import { findByPropsLazy, findLazy } from "@webpack";
import { ChannelStore, ComponentDispatch, GuildStore, PrivateChannelsStore, SelectedChannelStore } from "@webpack/common";
import { Guild, Message } from "discord-types/general";

const PreloadedUserSettings = findLazy(m => m.ProtoClass?.typeName.endsWith("PreloadedUserSettings"));
const MessageActions = findByPropsLazy("editMessage", "sendMessage");

export function getCurrentChannel() {
    return ChannelStore.getChannel(SelectedChannelStore.getChannelId());
}

export function getCurrentGuild(): Guild | undefined {
    return GuildStore.getGuild(getCurrentChannel()?.guild_id);
}

export function openPrivateChannel(userId: string) {
    PrivateChannelsStore.openPrivateChannel(userId);
}

export const enum Theme {
    Dark = 1,
    Light = 2
}

export function getTheme(): Theme {
    return PreloadedUserSettings.getCurrentValue()?.appearance?.theme;
}

export function insertTextIntoChatInputBox(text: string) {
    ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
        rawText: text,
        plainText: text
    });
}

interface MessageExtra {
    messageReference: Message["messageReference"];
    allowedMentions: {
        parse: string[];
        replied_user: boolean;
    };
    stickerIds: string[];
}

export function sendMessage(
    channelId: string,
    data: Partial<MessageObject>,
    waitForChannelReady?: boolean,
    extra?: Partial<MessageExtra>
) {
    const messageData = {
        content: "",
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...data
    };

    return MessageActions.sendMessage(channelId, messageData, waitForChannelReady, extra);
}
