YUI().use('node', 'anim', 'selector-css3', 'event', 'datatype-number', function (Y) {
  'use strict';

  var

  TMAP = {

    txtDims: {
      level_0: {},
      level_1: {}
    },

    getTreeMap: function (spending, canvasWidth, canvasHeight, myTaxes) {

      var

        totalSpendingMillions = 0,
        i,
        j,
        r,
        f,

        canvasArea = canvasWidth * canvasHeight,

        rectangle = function (area1, title1, id1) {
          var
            area = area1,
            width = area1,
            title = title1,
            id = id1;

          return {
            setWidth: function (w) {
              width = Math.floor(w);
            },
            getWidth: function () {
              return width;
            },
            recalculatedWidth: function (newHeight) {
              width = Math.floor(area / newHeight);
            },
            getArea: function () {
              return area;
            },
            getAspectRatio: function (height) {
              if (height > width) {
                return height / width;
              } else {
                return width / height;
              }
            },
            getTitle: function () {
              return title;
            },
            getId: function () {
              return id;
            }
          };
        },

        strip = function () {
          var
            rects = [],
            height = 1,
            area = 0;

          return {
            getHeight: function () {
              return height;
            },
            getWidth: function () {
              var total = 0, i;
              for (i = 0; i < rects.length; i += 1) {
                total += rects[i].getWidth();
              }
              return total;
            },
            getRects: function () {
              return rects;
            },
            addRect: function (r) {
              var i;
              rects.push(r);
              area += r.getArea();
              height = Math.floor(area / canvasWidth);
              for (i = 0; i < rects.length; i += 1) {
                rects[i].recalculatedWidth(height);
              }
            },
            removeRect: function (r) {
              var
                idx = Y.Array.indexOf(rects, r); // Find the index, native indexOf does not exist in ie
              if (idx !== -1) {
                rects.splice(idx, 1); // Remove it if really found!
                area -= r.getArea();
                height = Math.floor(area / canvasWidth);
                for (i = 0; i < rects.length; i += 1) {
                  rects[i].recalculatedWidth(height);
                }
              }// else {
               // console.log("ERROR");
             // }
            },
            getArea: function () {
              return area;
            },
            getAverageAspectRatio: function () {
              if (rects.length === 0) {
                return 10000;
              }
              var i, total = 0;
              for (i = 0; i < rects.length; i += 1) {
                total += rects[i].getAspectRatio(height);
              }
              return total / rects.length;
            }
          };
        },

        currStrip = strip(),
        strips = [currStrip],

        aveAspectRatio,
        newAveAspectRatio,

        newR,
        comboStrip,
        lastStrip,
        secondLastStrip,

        aveARof2,
        comboAR,

        rects,

        diff,

        calcData = {},

        returnTree = {},
        id;

      for (f in spending) {
        if (spending.hasOwnProperty(f)) {
          totalSpendingMillions += spending[f].millions;
          calcData[f] = {};
        }
      }


      for (f in spending) {
        if (spending.hasOwnProperty(f)) {
          calcData[f].ratio = spending[f].millions / totalSpendingMillions;
          calcData[f].rect = rectangle(calcData[f].ratio * canvasArea, spending[f].title, f);
        }
      }

      for (f in spending) {
        if (spending.hasOwnProperty(f)) {
          aveAspectRatio = currStrip.getAverageAspectRatio();
          currStrip.addRect(calcData[f].rect);
          newAveAspectRatio = currStrip.getAverageAspectRatio();
          if (newAveAspectRatio > aveAspectRatio) {
            currStrip.removeRect(calcData[f].rect);
            currStrip = strip();
            strips[strips.length] = currStrip;
            currStrip.addRect(calcData[f].rect);
          }
        }
      }

      // look ahead
      if (strips.length > 1) {
        comboStrip = strip();
        lastStrip = strips[strips.length - 1];
        secondLastStrip = strips[strips.length - 2];
        rects = secondLastStrip.getRects();
        for (i = 0; i < rects.length; i += 1) {
          newR = rectangle(rects[i].getArea(), rects[i].getTitle(), rects[i].getId());
          comboStrip.addRect(newR);
        }
        rects = lastStrip.getRects();
        for (i = 0; i < rects.length; i += 1) {
          newR = rectangle(rects[i].getArea(), rects[i].getTitle(), rects[i].getId());
          comboStrip.addRect(newR);
        }
        aveARof2 = (secondLastStrip.getAverageAspectRatio() + lastStrip.getAverageAspectRatio()) / 2;
        comboAR = comboStrip.getAverageAspectRatio();
        if (aveARof2 > comboAR) {
          // remove last 2 elements:
          strips.pop();
          strips.pop();
          // add the combo strip instead:
          strips.push(comboStrip);
        }
      }

      // need to check the rect widths add up to the canvas width in each strip.
      for (i = 0; i < strips.length; i += 1) {
        diff = strips[i].getWidth() - canvasWidth;
        rects = strips[i].getRects();
        f = rects.length;
        for (j = 0; j < diff; j += 1) {
          r = rects[j % f];
          r.setWidth(r.getWidth() - 1);
        }
        for (j = 0; j > diff; j -= 1) {
          r = rects[-j % f];
          r.setWidth(r.getWidth() + 1);
        }
      }


      for (i = 0; i < strips.length; i += 1) {
        returnTree[i] = {height: strips[i].getHeight(), children: {}}; // strip is parent
        rects  = strips[i].getRects();
        for (r = 0; r < rects.length; r += 1) {
          id = rects[r].getId();
          returnTree[i].children[id] = {}; // rect is child of strip
          returnTree[i].children[id].width = rects[r].getWidth();
          returnTree[i].children[id].tax = myTaxes * rects[r].getArea() / canvasArea;
          returnTree[i].children[id].title = rects[r].getTitle();
        }
      }

      return returnTree;

    }, // end of getTreeMap

    treeSearch: function (tree, id) {
      var stripI;
      for (stripI in tree) {
        if (tree.hasOwnProperty(stripI)) {
          if (tree[stripI].children.hasOwnProperty(id)) {
            return tree[stripI].children[id];
          }
        }
      }
    },

    stripNonNumeric: function (str) {
      str += '';
      var rgx = /^\d|\.|-$/, out = '', i;
      for (i = 0; i < str.length; i += 1) {
        if (rgx.test(str.charAt(i))) {
          if (!((str.charAt(i) === '.' && out.indexOf('.') !== -1) || (str.charAt(i) === '-' && out.length !== 0))) {
            out += str.charAt(i);
          }
        }
      }
      return out;
    },

    formatNum: function (str) {
      return Y.Number.format(str, {
        prefix: "£",
        thousandsSeparator: ",",
        decimalPlaces: 2
      });
    },

    renderRelativeTreeMap: function (container, boxes, width, height) {

      var
        formattedTaxes,
        id,
        stripI, strip,
        top = 0,
        html = '',
        b,
        currHTML = container.get("innerHTML");

      for (stripI in boxes) {
        if (boxes.hasOwnProperty(stripI)) {
          strip = boxes[stripI];

          html += '<div class="strip" style="height: ' + (100 * strip.height / height) + '%; top: ' + top + 'px">';
          for (id in strip.children) {
            if (strip.children.hasOwnProperty(id)) {

              b = strip.children[id];
              formattedTaxes = TMAP.formatNum(b.tax);

              // The div.inner is required to keep the floats in a line (without there did not seem to be a way to stop them going to the next line below the strip, effectively disappearing).
              // Changing the floats to something else (e.g. display: inline: block) to fix the above did not seem to be an option either.
              html += '<div title="' + b.title.replace(/<br>/gi, " ") + ': ' + formattedTaxes + '" id="' + id + '" class="container relative" style="float: left; width: ' +
                (100 * b.width / width) + '%; height: 100%">' +
                '<div class="inner"><div class="title_text">' + b.title + '<br>' + formattedTaxes + '</div></div></div>';

            }
          }

          html += '</div>';
          top += strip.height;

        }
      }

      container.set("innerHTML", html + currHTML);

    },

    renderAbsoluteTreeMap: function (container, boxes) {

      var
        stripI, strip,
        id,
        top = 0,
        left = 0,
        html = '',
        b,
        currHTML = container.get("innerHTML");

      for (stripI in boxes) {
        if (boxes.hasOwnProperty(stripI)) {
          strip = boxes[stripI];

          for (id in strip.children) {
            if (strip.children.hasOwnProperty(id)) {

              b = strip.children[id];

              html += '<div title="Click Me" id="' + id + '" class="container absolute" style="top: ' + top + 'px; left: ' + left + 'px; width: ' +
                b.width + 'px; height: ' + strip.height + 'px">' +
                '<div class="inner"><div class="title_text">' + b.title + '<br>' + TMAP.formatNum(b.tax) + '</div></div></div>';

              left += b.width;
            }
          }

          top += strip.height;
          left = 0;

        }
      }

      container.set("innerHTML", html + currHTML);

    },

    /**
     * playTxt.setStyle('fontSize', size + 'px') is an expensive operation.
     * Test data:
     * Searching for best fit incrementally, from 0 to maxSize: 4311 ops.
     * Searching for best fit incrementally, from maxSize to 0: 2287 ops.
     * Searching with recursive function, halving search space at each iteration: 575 ops.
     *
     */
    fitTxtToBox: (function () {
      var
        //count = 0,
        memo = {},
        fn = function (str, maxSize, width, height) {

          var
            hash = str + "/" + maxSize + "/" + width + "/" + height;

          if (typeof memo[hash] === 'number') {
            return memo[hash];
          }

          var
            playBox = Y.one('#play_box'),
            playTxt,
            w = width * 0.95,
            h = height * 0.95,

            chkSize = function (min, max) {
              if (min === max) {
                return min;
              }
              var size = min + Math.ceil((max - min) / 2); // could optimize this 2 :)
              
              playTxt.setStyle('fontSize', size + 'px');
              if (playTxt.get('offsetWidth') < w && playTxt.get('offsetHeight') < h) { // fits ok
                return chkSize(size, max);
              } else {
                return chkSize(min, size - 1);
              }
            };

          if (playBox === null) {

            playTxt = Y.Node.create('<div id="play_txt" class="title_text"></div>'); // class="title_text"
            playBox = Y.Node.create('<div id="play_box" class="inner" style="position: absolute; top: -2000px"></div>'); // class="inner"
            playBox.appendChild(playTxt);

            Y.one("body").appendChild(playBox);
          } else {
            playTxt = playBox.one('#play_txt');
          }

          playBox.setStyle('width', width);
          playBox.setStyle('height', height);
          playTxt.set('innerHTML', str);

          memo[hash] = chkSize(1, maxSize);

          return memo[hash];
        };

      return fn;

    }()),

    setTextSizes: function (container, level, max) {
      var
        maxSize = max || 200,
        returnSizes = {};
      // ".strip > .container > .inner"
      // .container divs could be in .strip divs, or not, depending on which type of rendering we used.
      container.all(".container > .inner").each(function (node) {
        var
          top,
          txt = node.one(".title_text"),
          innerHTML = txt.get('innerHTML'),
          offsetWidth = node.get('offsetWidth'),
          offsetHeight = node.get('offsetHeight'),
          size = TMAP.fitTxtToBox(innerHTML, maxSize, offsetWidth, offsetHeight),
          id = node.get('parentNode').get('id');

        txt.setStyle('fontSize', size + 'px');

        top = (offsetHeight / 2) - (txt.get('offsetHeight') / 2);
        txt.setStyle('top', top + 'px');
        txt.setStyle('width', '100%');   // this was: txt.setStyle('left', ((node.get('offsetWidth') / 2) - (txt.get('offsetWidth') / 2)) + 'px');


//        TMAP.txtDims[innerHTML + "/" + offsetWidth + "/" + offsetHeight] = {

        TMAP.txtDims[level][id] = { // should actually be dependant on window size (browser)
          size: size,
          top: top
        };


        maxSize = size;
        returnSizes[id] = size;

      });

      return returnSizes;
    },

    // need width and height, because we get them differently for body & div
    render: function (containerSel, spending, taxes, usrEnd) {

      var
        userEnd = typeof usrEnd === "undefined" ? true : usrEnd,
        width, height,
        s, textSizes, div, tree, subTree,
        closeNode = Y.Node.create('<div id="close" title="Back to totals">☒</div>'),
        container = Y.one(containerSel);

      if (containerSel === 'body') {
        width = container.get('winWidth');
        height = container.get('winHeight');
      } else {
        width = container.get('clientWidth');
        height = container.get('clientHeight');
      }

      container.set("innerHTML", '');

      // do the main areas
      tree = TMAP.getTreeMap(spending, width, height, taxes);
      TMAP.renderAbsoluteTreeMap(container, tree);
      textSizes = TMAP.setTextSizes(container, 'level_0');

      // do the sub-areas
      for (s in spending) {
        if (spending.hasOwnProperty(s) && spending[s].hasOwnProperty('parts')) {
          div = container.one("#" + s);
          subTree = TMAP.getTreeMap(spending[s].parts, div.get('clientWidth'), div.get('clientHeight'), TMAP.treeSearch(tree, s).tax);
          TMAP.renderRelativeTreeMap(div, subTree, div.get('clientWidth'), div.get('clientHeight'));
          TMAP.setTextSizes(div, 'level_0', textSizes[s]);
        }
      }

      if (!userEnd) {
        return;
      }

      container.append(closeNode);

      container.delegate("click", function (e) {

        if (!e.currentTarget.one(".strip")) {
          alert("No further details for this.");
          return;
        }

        var
          node = e.currentTarget,
          lastTop = node.getStyle('top'),
          lastLeft = node.getStyle('left'),
          lastWidth = node.get('clientWidth'),
          lastHeight = node.get('clientHeight'),

          expandAnim = new Y.Anim({
            node: node,
            to: {
              width: width,
              height: height,
              top: 0,
              left: 0
            }
          }),

          dimAnim = new Y.Anim({
            node: node.get('lastChild'),
            to: { opacity: 0 }
          });

        expandAnim.on('end', function () {
          closeNode.setStyle("display", "block");
//          node.all('.strip').addClass("unfaint"); //ie.
//          node.all('.strip > .container').addClass("unfaint"); //ie.
//          node.all('.strip > .container > .inner').addClass("unfaint"); //ie.
//          node.all('.strip > .container > .inner > .title_text').addClass("unfaint"); //ie.
          node.get('lastChild').setStyle("display",  "none"); //ie.hack
        });

        node.setAttribute("title", "");
        node.setStyle("zIndex", 1);

        node.all(".strip").each(function (sn) {
          var a = new Y.Anim({
            node: sn,
            to: { opacity: 1 }
          });
          a.run();
        });

        dimAnim.run();

        node.all("div.container.relative .title_text").each(function (sn) {
          var
            id = sn.get('parentNode').get('parentNode').get('id'),
            a = new Y.Anim({
              node: sn,
              to: {
                fontSize: TMAP.txtDims.level_1[id].size + 'px',
                top: TMAP.txtDims.level_1[id].top  + 'px'
              }
            });
          a.run();
        });

        expandAnim.run();

        closeNode.on("click", function (e) {

          node.get('lastChild').setStyle("display",  "block"); //ie.hack

          Y.Event.purgeElement(closeNode);
          closeNode.setStyle("display", "none");

          var
            shrinkAnim = new Y.Anim({
              node: node,
              to: {
                width: lastWidth,
                height: lastHeight,
                top: lastTop,
                left: lastLeft
              }
            }),

            undimAnim = new Y.Anim({
              node: node.get('lastChild'),
              to: { opacity: 1 }
            });

          shrinkAnim.on('end', function () {
            node.setStyle("zIndex", 0);
            node.setAttribute("title", "Click Me");
          });

          node.all("div.container.relative .title_text").each(function (sn) {
            var
              id = sn.get('parentNode').get('parentNode').get('id'),
              a = new Y.Anim({
                node: sn,
                to: {
                  fontSize: TMAP.txtDims.level_0[id].size + 'px',
                  top: TMAP.txtDims.level_0[id].top  + 'px'
                }
              });
            a.run();
          });

          node.all(".strip").each(function (sn) {
            var a = new Y.Anim({
              node: sn,
              to: { opacity: 0.1 }
            });
            a.run();
          });

          undimAnim.run();
          shrinkAnim.run();

        });

      }, "div.container.absolute"); // end of click handler

    } // end of render

  };

  Y.one('body').setStyle('cursor', 'pointer');

  Y.on('windowresize', function (e) {
    TMAP.render('body', TMAP_CONFIG.data, TMAP_CONFIG.value);
  });

  var
    body = Y.one("body"),
    width = body.get('winWidth'),
    height = body.get('winHeight'),
    fakeBody = Y.Node.create('<div id="fake_body" style="position: absolute; top: -' + height + '0px; height: ' + height + 'px; width: ' + width + 'px"></div>');
  body.appendChild(fakeBody);

  TMAP.render('#fake_body', TMAP_CONFIG.data, TMAP_CONFIG.value, false);

  // Simply rendering each sub-box in #fake_body doesn't work because the boxes have a different aspect ratio than the screen when rendered to the user.
  // So we need to expand each box in the above-rendered version in fakeBody.

  fakeBody.all("div.container.absolute").each(function (node) {
    node.setStyle('top', 0);
    node.setStyle('left', 0);
    node.setStyle('width', width + 'px');
    node.setStyle('height', height + 'px');
    TMAP.setTextSizes(node, 'level_1');
  });

  fakeBody.remove(true);


  TMAP.render('body', TMAP_CONFIG.data, TMAP_CONFIG.value);

}); // end onload
