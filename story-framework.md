# What the Snow Remembers — Story Framework

This is the internal story bible. Almost none of it is ever stated to the
player directly — the game has a strict no-text-during-gameplay rule, and
(per a later revision) there are no flashback cutscenes either — but every
environmental detail and every ending should trace back to something
concrete here. With no cutscenes to lean on, level design is now the
*only* place the story is told during play; the ending text screens are
the only place it's told directly. Vague symbolism reads as vague on
screen. Specific symbolism, even when withheld, reads as *intentional* —
players feel the difference even without being told the facts.

---

## Logline

An old man, dying, walks backward through his own life — spring to winter,
childhood to old age — trying to find his way home. What he remembers
along the way depends entirely on what he's willing to stop and pick up.

## The truth (never stated on-screen, but fixed for internal consistency)

- The **Traveler** is an old man. His death is natural — old age, not
  accident or illness-as-plot-point. The whole game takes place in the
  space between his final breath and whatever comes after: not purgatory,
  not judgment, just his own mind retracing itself one last time.
- **She** (never named on-screen; call her "the wife" in dev docs, or pick
  a private name for your own reference if it helps writing flashback
  staging — it will never appear in-game) was his wife. She predeceased
  him. Autumn is her passing, not a quarrel.
- The **house** — the recurring silhouette motif seen faintly across all
  four chapters — is the home they built together. It is simultaneously:
  literal (the actual house, the actual place), and emotional (reaching
  her again, laying himself down, being done). The game never
  disambiguates which meaning is "correct." Both are true at once.
- Spring's flashback is **not** about her — it's about his own childhood,
  the first time he was sent out into the world alone. This matters: it
  establishes "leaving/arriving alone" as the motif before the player ever
  meets the second figure, so Summer's introduction of her lands as a
  *relief* (he's not alone anymore) rather than a random new character.

## Theme

Not "grief is sad." More specific than that: **the things we're most
afraid to remember are usually the things we most need to, before we can
rest.** The four keys are optional because that's true to life — plenty
of people go their whole lives refusing to look back. The game doesn't
punish that choice (no key-gating), it just quietly shows you what it
costs (the 0-key ending's loop).

---

## Symbol glossary — keep these consistent across every chapter

| Symbol | Meaning | Where it should recur |
|---|---|---|
| **Snow** | The present moment; the "now" of his dying mind | Present in some form in all four chapters, even Summer — a single out-of-place snowflake, frost on one object, etc. Subtle in warm chapters, literal in Winter. |
| **The house (silhouette)** | The destination — home, her, rest | Always visible at extreme distance/edge of frame in all 4 chapters, slightly clearer each chapter, fully resolved only in the ending. |
| **The locket** | His capacity to remember / his willingness to look back | Pre-page (closed) → fills as echoes collected → ending (reflects final count). Never appears as a gameplay object he interacts with beyond picking up echoes — it's a UI/framing device, not a prop he holds on-screen. |

> **Design update:** echo pickups no longer trigger a flashback
> cutscene/silhouette animation. Collecting an echo should still give
> clear *feedback* — a slot filling in on the locket UI, a distinct sound
> cue, maybe a brief particle/light beat at the pickup point — but no
> staged scene plays. This means the four echoes carry no story content
> on their own anymore; all narrative payoff moves to two places instead:
> the ambient/environmental storytelling already described per chapter
> below (which now needs to carry more of the weight, not less), and the
> five ending text screens (§ below), which become the primary place the
> story is actually told. Keep this in mind when building out each
> chapter: the environment itself is now doing double duty as both mood
> and plot.
| **Doors / thresholds** | Moments of separation or passage | Spring: the doorway his parent releases him from. Autumn: the door she exits through. Consider reusing an actual door-shaped silhouette/geometry as a level-design motif in more than just flashbacks — a door player characters pass under at each chapter transition would tie mechanics to theme almost for free. |
| **Two figures becoming one** | Loneliness vs. companionship | Summer is the only chapter/flashback where a second full silhouette exists and stays. Everywhere else, he's alone. This makes Summer's warmth mechanical, not just visual — consider it genuinely being the "safest" or gentlest chapter in terms of hazard difficulty, if that's not already how it plays. |

---

## Chapter-by-chapter

Each chapter should carry its life-stage emotional register in level design
and mood even for players who collect zero echoes — the flashbacks are a
bonus layer of clarity, not the only place the story lives. A few ambient
environmental-storytelling ideas per chapter below, beyond the existing
echo/flashback content, so the world reads as authored even to a
no-collectible playthrough.

### Spring — "Beginning"
**Life stage:** Childhood, departure.
**Ambient storytelling (carries the whole chapter now — no cutscene):**
small, human-scaled background silhouettes early in the level (a house, a
fence, a path receding) that gradually give way to more open, empty
terrain as the chapter progresses — the level geometry itself enacting
"leaving home," legible with zero pickups collected. Lean hard into scale
here — per the video, the character already reads quite small against
tall background shapes; push that further specifically in Spring so he
reads as a child dwarfed by an adult world, even though mechanically he
controls the same as every other chapter. Consider placing the echo itself
near/inside one of these background silhouettes (e.g. just outside the
"house" shape) so that even players who don't consciously register the
symbolism get a spatial association between the echo and "home" for free.

### Summer — "Bloom"
**Life stage:** Companionship, the height of life.
**Ambient storytelling (carries the whole chapter now):** This should be
the warmest, most open, least hazardous-feeling chapter — mechanically and
visually the "good" memory, per the theme note above. Since there's no
cutscene to introduce her anymore, she needs to exist in this chapter
through level design alone: a second, non-interactive silhouette glimpsed
at a distance once or twice in the background (never approached, never
blocking a path, just present) is the game's only hint — for *any* player,
echo or no echo — that he is not always alone in this world. This is
arguably the single most important piece of environmental storytelling in
the whole game now that the flashbacks are gone; without it, "someone he
had loved" in the 2-key ending text has nothing to land on visually.

### Autumn — "Falling"
**Life stage:** Loss — her passing.
**Ambient storytelling (carries the whole chapter now):** The absence of
the background silhouette from Summer is the entire scene now — no
cutscene needed if the omission is deliberate and the player had a chance
to notice her in Summer first. Consider one small, quiet visual echo
instead of a staged scene: a single object from Summer's background
(a bench, a specific tree shape, a marker) reappearing here alone, subtly
changed (bare instead of full, still instead of moving) — a "same place,
her gone" beat that reads through composition alone. Falling
leaves/particles as a literal echo of the chapter title reinforce the mood
without needing narrative staging.

### Winter — "Stillness"
**Life stage:** The end — his own passing, alone, at peace.
**Ambient storytelling:** The house/silhouette motif should be at its
clearest and closest here regardless of echo count — every player reaches
its neighborhood by the end of this chapter. The actual payoff — whether
he's shown reaching, entering, or resting there — now lives entirely in
the ending text screen (§ below), not in a chapter cutscene.

---

## The five endings — full framing

**Design update:** endings are now full first-person passages (roughly
300–500 words each), not two-line couplets — the couplets from the
earlier revision are kept, but now serve as the closing lines each piece
builds toward, rather than the whole of the text. Presentation is still
plain text on the existing dark ending screen (per the sample footage) —
no staged visual differences between endings, no new cutscenes. This is a
content/length change only.

Voice: first person throughout (see updated Voice Rules below). The
Traveler is speaking as himself, in the moment, not being narrated about.

---

### 0 keys

I don't know this place.

The snow doesn't care whether I know it or not. It falls the same
over ground I couldn't name if my life depended on it — and maybe it
does. Maybe it always did. I keep moving because stopping seems worse
than not knowing why I'm moving.

There was green, once. And then yellow, and orange, and now this —
white, and quiet, and enormous. None of it felt like anything except
more walking. I don't remember arriving anywhere. I don't remember
leaving anywhere either. There's just this: one foot, then the other,
snow filling in the shape of my steps almost as soon as I lift them.

There should be a face I know. A door I'd recognize on sight, a name
that would land in my chest like something coming home to roost. There
isn't. There's only the shape of an absence where all of that should
sit — and the shape doesn't tell me *what's* missing, only that
something is.

I keep asking myself the same three things, over and over, the way a
man in a dark room keeps finding the same wall: *Where am I. Am I
going anywhere. What am I doing here.*

No answer comes. Maybe none was ever going to. Maybe the asking is
the whole of it, and I'll go on asking, here, in the snow, for as long
as there's a here to ask it in.

I reached the end and remembered nothing.

Somewhere, it began to snow again.

---

### 1 key

I've lost my way. I know that much, at least — which is more than
nothing, standing here where I'm fairly sure four roads used to meet,
though I couldn't tell you now which one brought me in.

Somewhere back there, I found a thing. Small. It fit easily in my
hand, whatever it was, wherever I found it — I remember the finding of
it more clearly than the thing itself. A weight. A little brightness
where before there'd been none. Some part of me insisted it mattered,
and that part hasn't steered me wrong about anything else today, so I
trusted it, and I kept it, and I still don't know what it's for.

But I know — the way you know weather is coming before the sky has
said a word about it — that I'm meant for somewhere. Not this snow.
Not this stopping-place with no name. Somewhere with a roof, and
warmth, and maybe someone who stopped expecting me a long time ago and
started, instead, merely hoping.

One thing isn't enough to build a life back out of. It's not enough to
tell you who I was, or who was waiting, or what I was walking toward
before I forgot I was walking toward anything at all. But it's enough
to know a life existed once — fully furnished, somewhere behind me —
and that I only carried one small piece of it out through the door.

I've lost my way.

But I'm sure I'm meant for somewhere.

---

### 2 keys

*Implementation note: the bracketed `[missing season]` below is filled
in at runtime with whichever of the two uncollected seasons comes first
in calendar order (spring → summer → autumn → winter). E.g. if the
player collected Spring and Winter, the missing seasons are Summer and
Autumn — "Summer" is used, being the earlier of the two.*

I remember someone.

Not a name — names are the first thing this cold takes, and it never
gives them back. But a shape. A warmth beside me that had weight, and
breath, and a particular way of turning toward me before I'd even
finished lifting my head to look. I remember being looked at like
that. I remember it mattering more than almost anything since.

It was — [missing season]. It was [missing season], I think.

No. That's not right. That's not where they were standing.

I reach for the season the way you reach for a word sitting right at
the edge of your tongue — certain of its shape, unable to make it
land. Each time I try, I come back holding the wrong one. Not that
season. Some other one. The one I can't quite—

It doesn't matter, maybe. What matters is the shape stayed, even after
the season didn't. What matters is that once, someone stood close
enough beside me that I still remember, even now, stripped of nearly
everything else, the exact angle of being loved.

Two fragments. Not enough to rebuild a face, or a voice, or the sound
of my own name in their mouth. But enough to know, with more certainty
than I know almost anything standing here in the snow, that I was not
always alone. That once there was an *us*, before there was only ever
*I*.

I remember someone. In the season of—

no. That wasn't it. I can't recall which.

Two fragments, and between them, the shape of someone I had loved.

---

### 3 keys

Three now. Three small weights, three small brightnesses, carried this
far without my quite meaning to keep them — and when I lay them out in
the snow, side by side, they very nearly make a shape I recognize.

Spring: leaving somewhere small, being sent out into somewhere large, a
hand letting go of mine at a doorway I can still see exactly, if I
close my eyes. Summer: warmth, and being looked at, and a version of
myself I liked better than most of the ones I've been since. Autumn: a
stillness. A door. Someone on the other side of it who didn't come
back through, and some part of me that understood, even then, not to
follow.

Three seasons. Almost a whole year, laid end to end. Almost a whole
life, if I squint and let the gaps blur soft at the edges.

But there's a fourth space here, unmistakably empty, sitting exactly
where a fourth season ought to be — and no matter how long I stand over
it, nothing rises up to fill it. Not a face. Not a color. Not even the
shape of a grief I could name properly, the way I've apparently
grieved the others. Just blank. Just missing, in a way none of the
other three are.

It's a strange thing, being this close to whole. Closer than I've been
all day — closer, maybe, than I had any right to expect — and still
short. Still one season away from being able to say, honestly, *I
remember my life.*

Almost enough to be a life.

One season, still missing.

---

### 4 keys

Spring first — a hand letting go of mine, a doorway, the particular
courage and cowardice of being sent out alone for the first time. I was
small enough, then, that the whole world came up to my shoulders.

Then summer. Warmth, and grass gone gold with light, and someone
turning to look at me the way you look at something you've just
decided, right then, to keep. I remember that look better than I
remember my own face at that age.

Then autumn — quieter. A door. A small weight set down gently, the way
you set down something you already know you won't be picking back up.
I didn't follow through that door. I understand now, finally, why I
couldn't. Some part of you always knows a goodbye the moment it
arrives, even while the rest of you keeps insisting on calling it
something smaller.

And winter. Winter is this — the snow, the walking, the long half-light
between having had a life and being finished having had one. Winter is
now.

Four seasons. My whole life, laid end to end, and for the first time
today none of it is missing. I can see all of it at once — the
leaving, the loving, the losing, and this, the long walk after — not as
four separate griefs I'd been carrying nameless, but as one thing. One
life. Mine.

There, ahead — the house. I know it now. I think I knew it the whole
time, underneath the not-knowing; I only needed all four seasons back
in my hands before I could let myself see it clearly.

Spring, summer, autumn, winter — mine, all of it.

I close my eyes.

This time, on purpose.

---

## Voice rules for any on-screen text (pre-page + endings only)

- **First person throughout.** The Traveler is speaking as himself, in
  the moment — not being described by a narrator. This applies to the
  pre-page line too: *"I remember nothing. Only that something is owed."*
- **Pre-page stays short** — one line, same restraint as before. The
  length expansion below applies to the five endings only.
- **Endings are now full passages (~300–500 words each)**, not couplets —
  but each one still closes on the short line originally written for it
  (see § above). Treat that closing line as the anchor the whole passage
  is walking toward; the added length should build *toward* that line,
  not dilute it.
- State the fact plainly, let the feeling live in what's *not* said
  outright — avoid naming emotions directly ("I was sad"); show the
  physical/sensory consequence of the emotion instead.
- No character is ever named. "I," "someone," "she" at most. The
  lack of names keeps the story universal rather than tying it to lore
  the player was never given directly.
- Never explain the house, the locket, or the season structure as
  game mechanics. The player is allowed to intuit the metaphor; the text
  rewards that intuition, it doesn't replace it with exposition.

---

## Resolved: her timeline relative to the game

**Decided:** she is already dead when the game begins. Autumn is a
remembered loss, not a live event happening "on screen" during the
Traveler's walk. This keeps the tone grounded rather than mystical — the
house/motif still works as both literal home and emotional arrival, it
just no longer implies a literal on-screen reunion. Nothing about the
4-key ending needs to state or deny an afterlife reunion explicitly; it
can stay exactly as ambiguous as the existing text already is — he sees
the house, closes his eyes "on purpose," and the reader is free to take
that as arrival, as death, or as both. Don't add anything that resolves
that ambiguity further — the not-knowing is doing useful work there.

---

## The intro (superseding the short pre-page line)

**Design update:** the one-line pre-page text ("I remember nothing. Only
that something is owed.") is superseded by a fuller intro passage,
triggered the *first* time the player enters Spring — not on a generic
title screen. Sequence: player clicks into Spring for the first time →
~2s black screen → this passage fades in as text → a
"Start the Journey" button at the bottom → gameplay begins.

This must be a **one-time-only** trigger (flagged via localStorage or
equivalent session/save state) — a player replaying Spring from chapter
select after finishing the game should not see this again. This is a
build requirement, not just a content note.

Presentation: same non-gameplay "reading" zone treatment as the pre-page
and endings — full first-person voice, same UI panel pattern as the
endings if one exists by the time this is built.

### Full text

```
I don't remember how I came to be standing here.

There is only this: cold air, a road running out ahead of me, and the
vague, persistent sense that I have somewhere to be. I couldn't tell
you where. I couldn't tell you why the wanting is so insistent — only
that it is, the way hunger is insistent, or thirst, except what I'm
hungry for isn't food. It's something further back than that.

Four seasons stretch out ahead of me, though I couldn't say how I know
there are four, or why the number matters so much. Spring first. Then
whatever comes after spring, and after that, and after that — until, I
assume, I arrive somewhere. Home, maybe. I keep circling that word
without being sure it's the right one.

There's a small locket at my chest. Empty, as far as I can tell — four
spaces, four small absences, waiting for something I don't have to
give them. I don't remember choosing to carry it. I don't remember
much of anything, if I'm honest, except the walking, and the cold, and
this quiet certainty that somewhere behind me — behind all of it —
there are things I once knew, and might, if I'm willing to look, find
again.

I don't have to look. That's the strange part. I could walk through
all four seasons and arrive wherever I'm going with the locket just as
empty as it is now. Nothing is stopping me from choosing not to
remember.

But something in me wants to. Something in me has wanted to for
longer than I can account for.

So I'll walk. And where the road offers me back a piece of what I've
lost, I think I'll stop, and carry it the rest of the way.

Whatever's waiting for me at the end of this — I'd like to meet it
knowing who I am.
```

**[ Start the Journey ]**

Note: this is the one place in the whole game where the "collecting is
optional" mechanic is acknowledged in-fiction, obliquely, as an
existential thought rather than a tutorial instruction. It's intentional
— it sets up the 0-key ending's meaning in advance without spelling it
out as a rule.
