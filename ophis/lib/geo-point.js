
var utilVector_point = null;

function initUtilVector()
{
	utilVector_point = utilVector_point == null ? new GeoPoint() : utilVector_point;
}

function GeoPoint (x, y, z)
{
	x = x == undefined ? 0 : x;
	y = y == undefined ? 0 : y;
	z = z == undefined ? 0 : z;
	this.set(x, y, z);
};

GeoPoint.prototype.getX = function()
{
	return this.m_x;
};

GeoPoint.prototype.calcNormal = function(vector_out)
{
	vector_out.copy(this);
	vector_out.normalize();
}

GeoPoint.prototype.normalize = function()
{
	var mag = this.calcLength();
	if ( mag != 0 )
	{
		this.set(this.m_x / mag, this.m_y / mag, this.m_z / mag);
	}
	else
	{
		this.zeroOut();
	}
}

GeoPoint.prototype.calcMidwayPoint = function(otherPoint, point_out)
{
	initUtilVector();
	this.calcDeltaTo(otherPoint, utilVector_point);
	utilVector_point.scaleByNumber(.5);
	point_out.copy(this);
	point_out.translateBy(utilVector_point);
};

GeoPoint.prototype.setX = function(value)
{
	this.m_x = value;
};

GeoPoint.prototype.getY = function()
{
	return this.m_y;
};

GeoPoint.prototype.setY = function(value)
{
	this.m_y = value;
};

GeoPoint.prototype.getZ = function()
{
	return this.m_z;
};

GeoPoint.prototype.setZ = function(value)
{
	this.m_z = value;
};

GeoPoint.prototype.incX = function(delta)
{
	this.m_x += delta;
};

GeoPoint.prototype.incY = function(delta)
{
	this.m_y += delta;
};

GeoPoint.prototype.incZ = function(delta)
{
	this.m_z += delta;
};
 
GeoPoint.prototype.calcDistanceTo = function(point)
{
	return Math.sqrt(this.calcDistanceSquaredTo(point));
};

GeoPoint.prototype.calcDeltaTo = function(toPoint, vector_out)
{
	vector_out.set(toPoint.m_x - this.m_x, toPoint.m_y - this.m_y, toPoint.m_z - this.m_z);
};

GeoPoint.prototype.toString = function()
{
	return "{" + this.m_x + ", " + this.m_y + ", " + this.m_z + "}";
};

GeoPoint.prototype.calcDistanceSquaredTo = function(point)
{
	var diffX = point.m_x - this.m_x;
	var diffY = point.m_y - this.m_y;
	var diffZ = point.m_z - this.m_z;
	
	return diffX*diffX + diffY*diffY + diffZ*diffZ;
};

GeoPoint.prototype.copy = function(point_nullable)
{
	if( point_nullable == null )  return;
	
	this.m_x = point_nullable.m_x;
	this.m_y = point_nullable.m_y;
	this.m_z = point_nullable.m_z;
};

GeoPoint.prototype.set = function(x, y, z)
{
	this.m_x = x;
	this.m_y = y;
	this.m_z = z == undefined ? 0.0 : z;
};

GeoPoint.prototype.translateBy = function(point)
{
	this.m_x += point.m_x;
	this.m_y += point.m_y;
	this.m_z += point.m_z;
};

GeoPoint.prototype.scaleByNumber = function(value_float)
{
	this.m_x *= value_float;
	this.m_y *= value_float;
	this.m_z *= value_float;
};

GeoPoint.prototype.round = function()
{
	this.m_x = Math.round(this.m_x);
	this.m_y = Math.round(this.m_y);
	this.m_z = Math.round(this.m_z);
};

GeoPoint.prototype.negate = function()
{
	this.m_x *= -1;
	this.m_y *= -1;
	this.m_z *= -1;
};

GeoPoint.prototype.calcLength = function()
{
	return Math.sqrt(this.calcLengthSquared());
};

GeoPoint.prototype.calcLengthSquared = function()
{
	return this.m_x * this.m_x + this.m_y * this.m_y + this.m_z*this.m_z;
};

GeoPoint.prototype.setLength = function(value)
{
	var mag = this.calcLength();
	
	if ( mag != 0 )
	{
		this.m_x /= mag;
		this.m_y /= mag;
		this.m_z /= mag;
	}
	
	this.scaleByNumber(value);
};

GeoPoint.prototype.calcSignedAngleTo = function(vector)
{
	function minimizeAngle(radians)
	{
		var absAngle = Math.abs(radians);
				
		if ( absAngle > Math.PI )
		{
			absAngle = Math.PI - (absAngle % Math.PI);
			
			radians = radians < 0 ? absAngle : -absAngle;
		}
		
		return radians;
	}

	var angle =  -(Math.atan2(vector.m_y, vector.m_x) - Math.atan2(this.m_y, this.m_x));
	
	angle = -angle; // flipping y axis from math world to screen world.
	
	angle = minimizeAngle(angle);
	
	return angle;
};

GeoPoint.prototype.calcClockwiseAngleTo = function(vector)
{
	var signedAngle = this.calcSignedAngleTo(vector);
	return signedAngle < 0 ? Math.PI + (Math.PI + signedAngle) : signedAngle;
};

GeoPoint.prototype.hitTestEclipse = function(eclipseX, eclipseY, eclipseWidth, eclipseHeight) {

	var a = this.m_x - eclipseX;
	var b = eclipseWidth;
	var c = this.m_y - eclipseY;
	var d = eclipseHeight;
 
    var p = (a*a) / (b*b) + (c*c) / (d*d);
 
    return p;
};

GeoPoint.prototype.hitTestCircle = function(circleX, circleY, radius) {
	var diam = radius*2;

	return this.hitTestEclipse(circleX, circleY, diam, diam);
};

GeoPoint.prototype.rotateBy = function(radians, origin_nullable)
{
	var originX, originY;
	
	if ( origin_nullable )
	{
		originX = origin_nullable.m_x;
		originY = origin_nullable.m_y;
	}
	else
	{
		originX = 0;
		originY = 0;
	}
	
	var sinRad = Math.sin(radians);
	var cosRad = Math.cos(radians);
	var newVertX = originX + cosRad * (this.m_x - originX) - sinRad * (this.m_y - originY);
	var newVertY = originY + sinRad * (this.m_x - originX) + cosRad * (this.m_y - originY);
	
	this.set(newVertX, newVertY);
};

GeoPoint.prototype.setToPerpVector = function(direction)
{
	direction = direction ? direction : -1;
	
	var tempX = this.m_x;
	var tempY = this.m_y;
	
	if ( direction >= 0 )
	{
		this.m_y = -tempX;
		this.m_x = tempY;
		
		this.set(tempY, -tempX);
	}
	else
	{
		this.set(-tempY, tempX);
	}
};


GeoPoint.prototype.moveTo = function(context)
{
	context.moveTo(this.getX() * PIXELS_PER_INCH, this.getY() * PIXELS_PER_INCH);
};

GeoPoint.prototype.lineTo = function(context)
{
	context.lineTo(this.getX() * PIXELS_PER_INCH, this.getY() * PIXELS_PER_INCH);
};

GeoPoint.prototype.circle = function(context, radius) {
	context.arc(this.getX() * PIXELS_PER_INCH, this.getY() * PIXELS_PER_INCH, radius * PIXELS_PER_INCH, 0, Math.PI*2);
}

GeoPoint.prototype.circleBackwards = function(context, radius) {
	context.arc(this.getX() * PIXELS_PER_INCH, this.getY() * PIXELS_PER_INCH, radius * PIXELS_PER_INCH, -0, -Math.PI*2);
}

var GEO_POINT__Y_AXIS = new GeoPoint(0, 1);