import uuid
import random
import time

import pygame
from pygame.constants import K_LEFT, K_a, K_RIGHT, K_d, K_SPACE


class BaseObject(pygame.sprite.Sprite):
    def __init__(self, ipath, position, scale=0.5):
        pygame.sprite.Sprite.__init__(self)

        self.uuid = str(uuid.uuid4())
        img = pygame.image.load(ipath)
        rect = img.get_rect(center=position)
        w, h = rect.size[0], rect.size[1]
        w, h = int(w * scale), int(h * scale)
        self.image = pygame.transform.scale(img, (w, h))
        self.rect = self.image.get_rect(center=position)
        self.should_kill = False

    def get_center(self):
        return self.rect.center

    def draw(self, surface, **kwargs):
        raise NotImplementedError('Not yet implemented')


class Bullet(BaseObject):
    def __init__(self, position, scale=1.0):
        BaseObject.__init__(self, './images/bullet.png', position, scale)

    def draw(self, surface, **kwargs):
        if self.should_kill:
            return

        x, y = self.rect.center
        self.rect.center = x, y - 5

        surface.blit(self.image, self.rect.center)

        if y <= 0:
            self.kill()

    @staticmethod
    def instance(**kwargs):
        return Bullet(kwargs['position'])


class Rock(BaseObject):
    def __init__(self, position, scale=1.0):
        BaseObject.__init__(self, './images/rock.png', position, scale)

    def draw(self, surface, **kwargs):
        if self.should_kill:
            return

        x, y = self.rect.center
        self.rect.center = x, y + 1

        surface.blit(self.image, self.rect.center)

        if y >= kwargs['height']:
            self.kill()


class Ship(BaseObject):
    def __init__(self, position, scale=1.0):
        BaseObject.__init__(self, './images/ship.png', position, scale)

    def draw(self, surface, **kwargs):
        width, height = kwargs['width'], kwargs['height']
        x, y = self.rect.center
        w, h = self.rect.size

        if 'keys' in kwargs:
            keys = kwargs['keys']
            if keys[K_LEFT] or keys[K_a]:
                if x - w / 2.0 >= 0:
                    x -= 4
            elif keys[K_RIGHT] or keys[K_d]:
                if x + w / 2.0 <= width:
                    x += 4

        self.rect.center = x, y

        surface.blit(self.image, self.rect.center)


class RockGenerator(object):
    def __init__(self, width, height):
        rock = Rock((width / 2.0, height / 2.0))
        w, h = rock.rect.size
        self.x_pos = [x for x in range(0, width, w)]
        self.prev_x = None
        self.start_time = None

    def should_generate(self):
        if self.start_time is None:
            self.start_time = time.time()
            return True

        stop_time = time.time()
        diff = int(stop_time - self.start_time)
        if diff >= 2:
            self.start_time = stop_time
            return True
        return False

    def next(self):
        while True:
            curr_x = random.choice(self.x_pos)
            if curr_x != self.prev_x:
                self.prev_x = curr_x
                return Rock((curr_x, 5))
