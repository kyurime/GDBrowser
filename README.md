# GDBrowser

colon makes messy code, so do I  
in any case this is GDBrowser as an incomplete port to the 1.9GDPS. some things work, some things don't and some things aren't possible!

## The API folder

This is where all the backend stuff happens! Yipee!

They're all fairly similar. Fetch something from boomlings.com, parse the response, and serve it in a crisp and non-intimidating JSON. This is probably what you came for.

The odd one out is icon.js, which is for generating GD icons. The code here is horrendous, so apologies in advance. Improvements to it (especially UFO and robot generation) would be greatly appreciated! (and i will love you forever)

## Assets

Assets! Assets everywhere!

All the GD stuff was ripped straight from the GD spritesheets via [Absolute's texture splitter hack](https://youtu.be/pYQgIyNhow8). If you want a nice categorized version, [I've done all the dirty work for you.](https://www.mediafire.com/file/4d99bw1zhwcl507/textures.zip/file)

/blocks and /objects are used for the analysis page. I just put them in seperate folders for extra neatness.

/gdfaces holds all the difficulty faces

Figure out what /gauntlets and /iconkitbuttons have.

## HTML

The HTML files! Nothing too fancy, since it can all be seen directly from gdbrowser. Note that profile.html and level.html have [[VARIABLES]] (name, id, etc) replaced by the server when they're sent.

## Icons

It's GJ_Gamesheet02 but split into a much more intimidating cluster of a million files. These icons are put together and colored in the monstrosity that is icon.js 

Also contains the very important .plist file

/cache is a folder for cached generated icons

/iconkit is a folder for the little grey preview icons on the icon kit

## Misc

Inevitable misc folder

### For level analysis

blocks.json - The object IDs in the different 'families' of blocks

colorProperties.json - Color channel cheatsheet

initialProperties.json - Level settings cheatsheet

objectProperties.json - Object property cheatsheet. Low budget version of [AlFas' one](https://github.com/gd-edit/GDAPI/blob/5a338c317b10ba0cb30d6175360c997a8a72502f/GDAPI/GDAPI/Enumerations/GeometryDash/ObjectParameter.cs)

objects.json - IDs for portals, orbs, triggers, and misc stuff

### Not for level analysis

colors.json - The colors for generating icons

level.json - An array of the official GD tracks, and also difficulty face stuff for level searching

mapPacks.json - The IDs for the levels in map packs. I can't believe I have to hardcode this.

sizecheck.js - Excecuted on most pages, used for the 'page isn't wide enough' message, back button, and a few other things

XOR.js - Decrypts ciphered GD passwords. I stole the code from somewhere so uh if you wrote it, please don't hunt me down

---

happy painting and god bless.
