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

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { ImageIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { LazyComponent } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { find, findByCode, findByPropsLazy } from "@webpack";
import { GuildMemberStore, Menu } from "@webpack/common";
import type { Channel, Guild, User } from "discord-types/general";

const ImageModal = LazyComponent(() => findByCode(".MEDIA_MODAL_CLOSE,"));
const MaskedLink = LazyComponent(() => find(m => m.type?.toString().includes("MASKED_LINK)")));
const BannerStore = findByPropsLazy("getGuildBannerURL");

interface UserContextProps {
    channel: Channel;
    guildId?: string;
    user: User;
}

interface GuildContextProps {
    guild: Guild;
}

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Choose the image format to use for non animated images. Animated images will always use .gif",
        options: [
            {
                label: "webp",
                value: "webp",
                default: true
            },
            {
                label: "png",
                value: "png",
            },
            {
                label: "jpg",
                value: "jpg",
            }
        ]
    }
});

function openImage(url: string) {
    const format = url.startsWith("/") ? "png" : settings.store.format;
    const u = new URL(url, window.location.href);
    u.searchParams.set("size", "512");
    u.pathname = u.pathname.replace(/\.(png|jpe?g|webp)$/, `.${format}`);
    url = u.toString();

    openModal(modalProps => (
        <ModalRoot size={ModalSize.DYNAMIC} {...modalProps}>
            <ImageModal
                shouldAnimate={true}
                original={url}
                src={url}
                renderLinkComponent={MaskedLink}
            />
        </ModalRoot>
    ));
}

const UserContext: NavContextMenuPatchCallback = (children, { user, guildId }: UserContextProps) => () => {
    const memberAvatar = GuildMemberStore.getMember(guildId!, user.id)?.avatar || null;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="view-avatar"
                label="View Avatar"
                action={() => openImage(BannerStore.getUserAvatarURL(user, true, 512))}
                icon={ImageIcon}
            />
            {memberAvatar && (
                <Menu.MenuItem
                    id="view-server-avatar"
                    label="View Server Avatar"
                    action={() => openImage(BannerStore.getGuildMemberAvatarURLSimple({
                        userId: user.id,
                        avatar: memberAvatar,
                        guildId
                    }, true))}
                    icon={ImageIcon}
                />
            )}
        </Menu.MenuGroup>
    ));
};

const GuildContext: NavContextMenuPatchCallback = (children, { guild: { id, icon, banner } }: GuildContextProps) => () => {
    if (!banner && !icon) return;

    children.splice(-1, 0, (
        <Menu.MenuGroup>
            {icon ? (
                <Menu.MenuItem
                    id="view-icon"
                    label="View Icon"
                    action={() =>
                        openImage(BannerStore.getGuildIconURL({
                            id,
                            icon,
                            size: 512,
                            canAnimate: true
                        }))
                    }
                    icon={ImageIcon}
                />
            ) : null}
            {banner ? (
                <Menu.MenuItem
                    id="view-banner"
                    label="View Banner"
                    action={() =>
                        openImage(BannerStore.getGuildBannerURL({
                            id,
                            banner,
                        }, true))
                    }
                    icon={ImageIcon}
                />
            ) : null}
        </Menu.MenuGroup>
    ));
};

export default definePlugin({
    name: "ViewIcons",
    authors: [Devs.Ven, Devs.TheKodeToad, Devs.Nuckyz],
    description: "Makes avatars and banners in user profiles clickable, and adds View Icon/Banner entries in the user and server context menu",
    tags: ["ImageUtilities"],

    settings,

    openImage,

    start() {
        addContextMenuPatch("user-context", UserContext);
        addContextMenuPatch("guild-context", GuildContext);
    },

    stop() {
        removeContextMenuPatch("user-context", UserContext);
        removeContextMenuPatch("guild-context", GuildContext);
    },

    patches: [
        // Make pfps clickable
        {
            find: "onAddFriend:",
            replacement: {
                match: /\{src:(\i)(?=,avatarDecoration)/,
                replace: "{src:$1,onClick:()=>$self.openImage($1)"
            }
        },
        // Make banners clickable
        {
            find: ".NITRO_BANNER,",
            replacement: {
                // style: { backgroundImage: shouldShowBanner ? "url(".concat(bannerUrl,
                match: /style:\{(?=backgroundImage:(\i&&\i)\?"url\("\.concat\((\i),)/,
                replace:
                    // onClick: () => shouldShowBanner && openImage(bannerUrl), style: { cursor: shouldShowBanner ? "pointer" : void 0,
                    'onClick:()=>$1&&$self.openImage($2),style:{cursor:$1?"pointer":void 0,'
            }
        },
        {
            find: "().avatarWrapperNonUserBot",
            replacement: {
                match: /(?<=avatarPositionPanel.+?)onClick:(\i\|\|\i)\?void 0(?<=,(\i)=\i\.avatarSrc.+?)/,
                replace: "style:($1)?{cursor:\"pointer\"}:{},onClick:$1?()=>{$self.openImage($2)}"
            }
        }
    ]
});
