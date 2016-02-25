var sigInst, canvas, $GP

//Load configuration file
var config = {};

//For debug allow a config=file.json parameter to specify the config
function GetQueryStringParams(sParam, defaultVal) {
  var sPageURL = "" + window.location; //.search.substring(1);//This might be causing error in Safari?
  if (sPageURL.indexOf("?") == -1) return defaultVal;
  sPageURL = sPageURL.substr(sPageURL.indexOf("?") + 1);
  var sURLVariables = sPageURL.split('&');
  for (var i = 0; i < sURLVariables.length; i++) {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam) {
      return sParameterName[1];
    }
  }
  return defaultVal;
}


jQuery.getJSON(GetQueryStringParams("config", "config.json"), function(data, textStatus, jqXHR) {
  config = data;

  if (config.type != "network") {
    //bad config
    alert("Invalid configuration settings.")
    return;
  }

  //As soon as page is ready (and data ready) set up it
  $(document).ready(setupGUI(config));
}); //End JSON Config load


// FUNCTION DECLARATIONS

Object.size = function(obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

function initSigma(config) {
  var data = config.data

  var drawProps, graphProps, mouseProps;
  if (config.sigma && config.sigma.drawingProperties)
    drawProps = config.sigma.drawingProperties;
  else
    drawProps = {
      defaultLabelColor: "#000",
      defaultLabelSize: 14,
      defaultLabelBGColor: "#ddd",
      defaultHoverLabelBGColor: "#222",
      defaultLabelHoverColor: "#fff",
      labelThreshold: 10,
      defaultEdgeType: "curve",
      defaultEdgeArrow: "target",
      hoverFontStyle: "",
      fontStyle: "",
      activeFontStyle: ""
    };

  if (config.sigma && config.sigma.graphProperties)
    graphProps = config.sigma.graphProperties;
  else
    graphProps = {
      minNodeSize: 1,
      maxNodeSize: 7,
      minEdgeSize: 0.2,
      maxEdgeSize: 0.5
    };

  if (config.sigma && config.sigma.mouseProperties)
    mouseProps = config.sigma.mouseProperties;
  else
    mouseProps = {
      minRatio: 5, // How far can we zoom out?
      maxRatio: 20, // How far can we zoom in?
    };

  var a = sigma.init(document.getElementById("sigma-canvas")).drawingProperties(drawProps).graphProperties(graphProps).mouseProperties(mouseProps);
  sigInst = a;
  a.active = !1;
  a.neighbors = {};
  a.detail = !1;


  dataReady = function() { //This is called as soon as data is loaded
    a.clusters = {};

    a.iterNodes(
      function(b) { //This is where we populate the array used for the group select box

        // note: index may not be consistent for all nodes. Should calculate each time.
        // alert(JSON.stringify(b.attr.attributes[5].val));
        // alert(b.x);
        a.clusters[b.color] || (a.clusters[b.color] = []);
        a.clusters[b.color].push(b.id); //SAH: push id not label
      }

    );

    a.bind("upnodes", function(a) {
      nodeActive(a.content[0])
    });

    a.draw();
    a.position(0,0,1);
    a.zoomTo(a._core.domElements.nodes.width / 2, a._core.domElements.nodes.height / 2, 2);
    configSigmaElements(config);
  }

  if (data.indexOf("gexf") > 0 || data.indexOf("xml") > 0)
    a.parseGexf(data, dataReady);
  else
    a.parseJson(data, dataReady);
  gexf = sigmaInst = null;
}


function setupGUI(config) {

  $GP = {
    calculating: !1,
    showgroup: !1
  };
  $GP.intro = $("#intro");
  $GP.minifier = $GP.intro.find("#minifier");
  $GP.mini = $("#minify");
  $GP.info = $("#attributepane");
  $GP.info_donnees = $GP.info.find(".nodeattributes");
  $GP.info_name = $GP.info.find(".name");
  $GP.info_link = $GP.info.find(".link");
  $GP.info_data = $GP.info.find(".data");
  $GP.info_close = $GP.info.find(".returntext");
  $GP.info_close2 = $GP.info.find(".close");
  $GP.info_p = $GP.info.find(".p");
  $GP.info_close.click(nodeNormal);
  $GP.info_close2.click(nodeNormal);
  $GP.form = $("#mainpanel").find("form");
  $GP.search = new Search($GP.form.find("#search"));

  config.GP = $GP;
  initSigma(config);
}

function configSigmaElements(config) {
  $GP = config.GP;


  $GP.bg = $(sigInst._core.domElements.bg);
  $GP.bg2 = $(sigInst._core.domElements.bg2);

  b = {
    minWidth: 400,
    maxWidth: 800,
    maxHeight: 600
  }; //        minHeight: 300,
  $("a.fb").fancybox(b);
  $("#zoom").find("div.z").each(function() {
    var a = $(this),
      b = a.attr("rel");
    a.click(function() {
      if (b == "center") {
        var a = sigInst._core;
        sigInst.position(0, 0, 1).draw();
        //sigInst.zoomTo(a.domElements.nodes.width / 2, a.domElements.nodes.height / 2, 3);
      } else {
        var a = sigInst._core;
        sigInst.zoomTo(a.domElements.nodes.width / 2, a.domElements.nodes.height / 2, a.mousecaptor.ratio * ("in" == b ? 1.5 : 0.5));
      }

    })
  });
  $GP.mini.click(function() {
    $GP.mini.hide();
    $GP.intro.show();
    $GP.minifier.show()
  });
  $GP.minifier.click(function() {
    $GP.intro.hide();
    $GP.minifier.hide();
    $GP.mini.show()
  });
  $GP.intro.find("#showGroups").click(function() {
    !0 == $GP.showgroup ? showGroups(!1) : showGroups(!0)
  });
  a = window.location.hash.substr(1);
  if (0 < a.length) {
    $GP.search.exactMatch = !0, $GP.search.search(a)
    $GP.search.clean();
  }

}

function Search(a) {
  this.input = a.find("input[name=search]");
  this.state = a.find(".state");
  this.results = a.find(".results");
  this.exactMatch = !1;
  this.lastSearch = "";
  this.searching = !1;
  var b = this;
  this.input.focus(function() {
    var a = $(this);
    a.data("focus") || (a.data("focus", !0), a.removeClass("empty"));
    b.clean()
  });
  this.input.keydown(function(a) {
    if (13 == a.which) return b.state.addClass("searching"), b.search(b.input.val()), !1
  });
  this.state.click(function() {
    var a = b.input.val();
    b.searching && a == b.lastSearch ? b.close() : (b.state.addClass("searching"), b.search(a))
  });
  this.dom = a;
  this.close = function() {
    this.state.removeClass("searching");
    this.results.hide();
    this.searching = !1;
    this.input.val(""); //SAH -- let's erase string when we close
    nodeNormal()
  };
  this.clean = function() {
    this.results.empty().hide();
    this.state.removeClass("searching");
    this.input.val("");
  };
  this.search = function(a) {
    var b = !1,
      c = [],
      b = this.exactMatch ? ("^" + a + "$").toLowerCase() : a.toLowerCase(),
      g = RegExp(b);
    this.exactMatch = !1;
    this.searching = !0;
    this.lastSearch = a;
    this.results.empty();
    if (2 >= a.length) this.results.html("<i>En az 3 karakter girmeniz gerekmektedir.</i>");
    else {
      sigInst.iterNodes(function(a) {
        if (g.test(a.attr.attributes.name.toLowerCase()) || g.test(a.label.toLowerCase())) {
          c.push({
            id: a.id,
            name: a.label,
            full_name: a.attr.attributes.name
          });
        }
      });
      c.length ? (b = !0, nodeActive(c[0].id)) : b = showCluster(a);
      a = [];
      if (1 < c.length)
        for (var d = 0, h = c.length; d < h; d++) a.push('<div class="link-item"><a href="#' + c[d].name + '" onclick="nodeActive(\'' + c[d].id + "')\">"+ c[d].name +"</i></a></div>");
      0 == c.length && !b && a.push("<i>Hiç kullanıcı bulunamadı.</i>");
      this.results.html(a.join(""));
    }
    if (c.length != 1) this.results.show();
    if (c.length == 1) this.results.hide();
  }
}

function Cluster(a) {
  this.cluster = a;
  this.display = !1;
  this.list = this.cluster.find(".list");
  this.list.empty();
  this.select = this.cluster.find(".select");
  this.select.click(function() {
    $GP.cluster.toggle()
  });
  this.toggle = function() {
    this.display ? this.hide() : this.show()
  };
  this.content = function(a) {
    this.list.html(a);
    this.list.find("a").click(function() {
      var a = $(this).attr("href").substr(1);
      showCluster(a)
    })
  };
  this.hide = function() {
    this.display = !1;
    this.list.hide();
    this.select.removeClass("close")
  };
  this.show = function() {
    this.display = !0;
    this.list.show();
    this.select.addClass("close")
  }
}

function showGroups(a) {
  a ? ($GP.intro.find("#showGroups").text("Hide groups"), $GP.bg.show(), $GP.bg2.hide(), $GP.showgroup = !0) : ($GP.intro.find("#showGroups").text("View Groups"), $GP.bg.hide(), $GP.bg2.show(), $GP.showgroup = !1)
}

function nodeNormal() {
  !0 != $GP.calculating && !1 != sigInst.detail && (showGroups(!1), $GP.calculating = !0, sigInst.detail = !0, $GP.info.delay(400).animate({
    width: 'hide'
  }, 350), sigInst.iterEdges(function(a) {
    a.attr.color = !1;
    a.hidden = !1
  }), sigInst.iterNodes(function(a) {
    a.hidden = !1;
    a.attr.color = !1;
    a.attr.lineWidth = !1;
    a.attr.size = !1
  }), sigInst.draw(2, 2, 2, 2), sigInst.neighbors = {}, sigInst.active = !1, $GP.calculating = !1, window.location.hash = "")
}

function colorLuminance(hex, lum) {

	// validate hex string
	hex = String(hex).replace(/[^0-9a-f]/gi, '');
	if (hex.length < 6) {
		hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	}
	lum = lum || 0;

	// convert to decimal and change luminosity
	var rgb = "#", c, i;
	for (i = 0; i < 3; i++) {
		c = parseInt(hex.substr(i*2,2), 16);
		c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
		rgb += ("00"+c).substr(c.length);
	}

	return rgb;
}

function rgbToHex(a){
  a=a.replace(/[^\d,]/g,"").split(",");
  return"#"+((1<<24)+(+a[0]<<16)+(+a[1]<<8)+ +a[2]).toString(16).slice(1)
}

function nodeActive(a) {

  var groupByDirection = false;
  if (config.informationPanel.groupByEdgeDirection && config.informationPanel.groupByEdgeDirection == true) groupByDirection = true;

  sigInst.neighbors = {};
  sigInst.detail = !0;
  var b = sigInst._core.graph.nodesIndex[a];
  showGroups(!1);
  var outgoing = {},
    incoming = {},
    mutual = {}; //SAH
  sigInst.iterEdges(function(b) {
    b.attr.lineWidth = !1;
    b.hidden = !0;

    n = {
      name: b.label,
      colour: b.color
    };

    if (a == b.source) outgoing[b.target] = n; //SAH
    else if (a == b.target) incoming[b.source] = n; //SAH
    if (a == b.source || a == b.target) sigInst.neighbors[a == b.target ? b.source : b.target] = n;
    b.hidden = !1, b.attr.color = "rgba(0, 0, 0, 1)";
  });
  var f = [];
  sigInst.iterNodes(function(a) {
    a.hidden = !0;
    a.attr.lineWidth = !1;
    a.attr.color = a.color
  });

  if (groupByDirection) {
    //SAH - Compute intersection for mutual and remove these from incoming/outgoing
    for (e in outgoing) {
      //name=outgoing[e];
      if (e in incoming) {
        mutual[e] = outgoing[e];
        delete incoming[e];
        delete outgoing[e];
      }
    }
  }

  var createList = function(c) {
    var f = [];
    var e = [],
      //c = sigInst.neighbors,
      g;
    for (g in c) {
      var d = sigInst._core.graph.nodesIndex[g];
      d.hidden = !1;
      d.attr.lineWidth = !1;
      d.attr.color = c[g].colour;
      a != g && e.push({
        id: g,
        name: d.label,
        full_name: d.attr.attributes.name,
        avatar: d.attr.attributes.avatar,
        group: (c[g].name) ? c[g].name : "",
        colour: c[g].colour
      })
    }
    e.sort(function(a, b) {
      var c = a.group.toLowerCase(),
        d = b.group.toLowerCase(),
        e = a.name.toLowerCase(),
        f = b.name.toLowerCase();
      return c != d ? c < d ? -1 : c > d ? 1 : 0 : e < f ? -1 : e > f ? 1 : 0
    });
    d = "";
    for (g in e) {
      c = e[g];
      f.push('<div class="link-item"><a href="#' + c.name + '" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + c.id + '\'])\" onclick=\"nodeActive(\'' + c.id + '\')" onmouseout="sigInst.refresh()">' + c.name + '</a></div>');
    }
    return f;
  }

  var f = [];

  if (groupByDirection) {
    size = Object.size(mutual);
    f.push("<h2>Karşılıklı Takip Ettikleri (" + size + ")</h2>");
    f.push('<div class="links">');
    (size > 0) ? f = f.concat(createList(mutual)): f.push("Karşılıklı takip edilen kullanıcı bulunamadı.<br>");
    f.push('</div><div class="clearfix"></div>');
    size = Object.size(incoming);
    f.push("<h2>Karşılıksız Takip Edenler (" + size + ")</h2>");
    f.push('<div class="links">');
    (size > 0) ? f = f.concat(createList(incoming)): f.push("Bu kullanıcıyı takip eden biri bulunamadı.<br>");
    f.push('</div><div class="clearfix"></div>');
    size = Object.size(outgoing);
    f.push("<h2>Karşılıksız Takip Ettikleri (" + size + ")</h2>");
    f.push('<div class="links">');
    (size > 0) ? f = f.concat(createList(outgoing)): f.push("Bu kullanıcı kimseyi takip etmiyor.<br>");
    f.push('</div><div class="clearfix"></div>');
  } else {
    f = f.concat(createList(sigInst.neighbors));
  }
  //b is object of active node -- SAH
  b.hidden = !1;
  b.attr.color = b.color;
  b.attr.lineWidth = 6;
  b.attr.strokeStyle = "#000000";
  sigInst.draw(2, 2, 2, 2);

  $GP.info_link.html(f.join(""));

  var hex = rgbToHex(b.color);
  $GP.info_link.find('.link-item').css('backgroundColor', colorLuminance(hex, -0.5));
  $GP.info_link.find(".link-item").each(function() {
    var a = $(this),
      b = a.attr("rel");
  });
  f = b.attr;

  if (f.attributes) {
    var image_attribute = false;
    if (config.informationPanel.imageAttribute) {
      image_attribute = config.informationPanel.imageAttribute;
    }

    $GP.info_name.html("<div class=\"row profile-info\"><div class=\"col-md-2\"><img src=" + f.attributes[image_attribute].replace('normal', '400x400') + " style=\"vertical-align:middle\" /></div><div class=\"col-md-10\"> <span class=\"name\" onmouseover=\"sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex['" + b.id + '\'])" onmouseout="sigInst.refresh()">' + f.attributes.name + "</span><br><span class=\"username\" onmouseover=\"sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex['" + b.id + '\'])" onmouseout="sigInst.refresh()">@' + b.label + "</span></div></div>");
  }
  $GP.info_data.show();
  $GP.info.css('backgroundColor', f.color.replace(')', ', 0.6)').replace('rgb', 'rgba'));


  $GP.info.animate({
    width: 'show'
  }, 350);
  $GP.info_donnees.hide();
  $GP.info_donnees.show();
  sigInst.active = a;
  window.location.hash = b.label;
}

function showCluster(a) {
  var b = sigInst.clusters[a];
  if (b && 0 < b.length) {
    showGroups(!1);
    sigInst.detail = !0;
    b.sort();
    sigInst.iterEdges(function(a) {
      a.hidden = !1;
      a.attr.lineWidth = !1;
      a.attr.color = !1
    });
    sigInst.iterNodes(function(a) {
      a.hidden = !0
    });
    for (var f = [], e = [], c = 0, g = b.length; c < g; c++) {
      var d = sigInst._core.graph.nodesIndex[b[c]];
      !0 == d.hidden && (e.push(b[c]), d.hidden = !1, d.attr.lineWidth = !1, d.attr.color = d.color, f.push('<li class="membership"><a href="#' + d.label + '" onmouseover="sigInst._core.plotter.drawHoverNode(sigInst._core.graph.nodesIndex[\'' + d.id + "'])\" onclick=\"nodeActive('" + d.id + '\')" onmouseout="sigInst.refresh()">' + d.label + "</a></li>"))
    }
    sigInst.clusters[a] = e;
    sigInst.draw(2, 2, 2, 2);
    $GP.info_name.html("<b>" + a + "</b>");
    $GP.info_data.hide();
    $GP.info_p.html("Group Members:");
    $GP.info_link.find("ul").html(f.join(""));
    $GP.info.animate({
      width: 'show'
    }, 350);
    $GP.search.clean();
    $GP.cluster.hide();
    return !0
  }
  return !1
}
